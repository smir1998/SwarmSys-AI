from __future__ import annotations
import asyncio, contextlib, json, os, sqlite3, time, uuid
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from graph import FallbackSwarmGraph, build_swarm_graph
from state import SwarmState

class PersistentStore:
    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path or os.getenv("SWARMSYS_SQLITE_PATH", "swarmsys_prod.db")
        with self._conn() as c:
            c.executescript("""
                CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, task TEXT NOT NULL, domain TEXT NOT NULL, score INTEGER NOT NULL, at INTEGER NOT NULL, wall_ms INTEGER NOT NULL, report TEXT NOT NULL, origin TEXT NOT NULL, operator TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS ltm (operator TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (operator, key));
                CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, task TEXT NOT NULL, every_min INTEGER NOT NULL, next_due INTEGER NOT NULL, runs INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1, operator TEXT NOT NULL DEFAULT 'op-default', created_at INTEGER NOT NULL);
            """)
            if c.execute("SELECT COUNT(*) AS n FROM operators").fetchone()["n"] == 0:
                c.execute("INSERT INTO operators VALUES (?, ?, ?)", ("op-default", "Lead Architect", int(time.time() * 1000)))

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def list_operators(self) -> List[Dict[str, Any]]:
        with self._conn() as c:
            return [dict(r) for r in c.execute("SELECT id, name, created_at AS createdAt FROM operators ORDER BY created_at ASC LIMIT 100").fetchall()]

    def add_operator(self, name: str) -> Dict[str, Any]:
        op = {"id": f"op_{uuid.uuid4().hex[:8]}", "name": name.strip()[:80], "createdAt": int(time.time() * 1000)}
        with self._conn() as c:
            c.execute("INSERT INTO operators VALUES (?, ?, ?)", (op["id"], op["name"], op["createdAt"]))
        return op

    def list_ledger(self, operator: str) -> List[Dict[str, Any]]:
        with self._conn() as c:
            return [dict(r) for r in c.execute("SELECT id, task, domain, score, at, wall_ms AS wallMs, report, origin, operator FROM ledger WHERE operator = ? ORDER BY at DESC LIMIT 50", (operator,)).fetchall()]

    def push_ledger(self, r: Dict[str, Any]) -> Dict[str, Any]:
        with self._conn() as c:
            c.execute("INSERT OR REPLACE INTO ledger VALUES (?,?,?,?,?,?,?,?,?)", (r["id"], r["task"][:4000], r["domain"][:120], int(r["score"]), int(r["at"]), int(r["wallMs"]), r["report"][:50000], r["origin"], r["operator"][:80]))
        return r

    def list_ltm(self, op: str) -> List[Dict[str, str]]:
        with self._conn() as c:
            return [dict(r) for r in c.execute("SELECT key, value FROM ltm WHERE operator = ? ORDER BY updated_at DESC LIMIT 100", (op,)).fetchall()]

    def upsert_ltm(self, op: str, k: str, v: str) -> Dict[str, str]:
        with self._conn() as c:
            c.execute("INSERT OR REPLACE INTO ltm VALUES (?,?,?,?)", (op[:80], k[:120], v[:4000], int(time.time() * 1000)))
        return {"key": k[:120], "value": v[:4000]}

    def clear_ltm(self, op: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM ltm WHERE operator = ?", (op,))

    def list_schedules(self) -> List[Dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute("SELECT id, task, every_min AS everyMin, next_due AS nextDue, runs, enabled, operator, created_at AS createdAt FROM schedules ORDER BY created_at DESC LIMIT 100").fetchall()
            return [{**dict(r), "enabled": bool(r["enabled"])} for r in rows]

    def add_schedule(self, task: str, every_min: int, operator: str = "op-default") -> Dict[str, Any]:
        m = max(5, min(60, int(every_min)))
        now = int(time.time() * 1000)
        s = {"id": f"sch_{uuid.uuid4().hex[:8]}", "task": task.strip()[:4000], "everyMin": m, "nextDue": now + m * 60000, "runs": 0, "enabled": True, "operator": operator[:80], "createdAt": now}
        with self._conn() as c:
            c.execute("INSERT INTO schedules VALUES (?,?,?,?,?,1,?,?)", (s["id"], s["task"], m, s["nextDue"], 0, s["operator"], now))
        return s

    def toggle_schedule(self, sid: str) -> Optional[Dict[str, Any]]:
        with self._conn() as c:
            row = c.execute("SELECT enabled FROM schedules WHERE id = ?", (sid,)).fetchone()
            if not row: return None
            c.execute("UPDATE schedules SET enabled = ? WHERE id = ?", (0 if row["enabled"] else 1, sid))
            u = c.execute("SELECT id, task, every_min AS everyMin, next_due AS nextDue, runs, enabled, operator, created_at AS createdAt FROM schedules WHERE id = ?", (sid,)).fetchone()
            return {**dict(u), "enabled": bool(u["enabled"])}

    def delete_schedule(self, sid: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM schedules WHERE id = ?", (sid,))

    def mark_schedule_executed(self, sid: str, every_min: int) -> None:
        with self._conn() as c:
            c.execute("UPDATE schedules SET runs = runs + 1, next_due = ? WHERE id = ?", (int(time.time() * 1000) + int(every_min) * 60000, sid))

store = PersistentStore()
engine_runner = FallbackSwarmGraph(interrupt_for_approval=True)
_run_start: Dict[str, int] = {}

async def _scheduler_daemon() -> None:
    while True:
        try:
            now_ms = int(time.time() * 1000)
            for s in store.list_schedules():
                if s["enabled"] and s["nextDue"] <= now_ms:
                    rid = f"run_{uuid.uuid4().hex[:8]}"
                    t0 = int(time.time() * 1000)
                    init: SwarmState = {"run_id": rid, "task": s["task"], "operator": s["operator"], "origin": "schedule", "live_web": True, "auto_approve": True, "human_approved": True}
                    st: SwarmState = init
                    for _n, _d, cur in engine_runner.run_until_interrupt_or_end(rid, init, False):
                        st = cur
                        await asyncio.sleep(0)
                    rec = {"id": rid, "task": s["task"], "domain": st.get("domain", "scheduled"), "score": int(st.get("review_score", 94)), "at": int(time.time() * 1000), "wallMs": max(50, int(time.time() * 1000) - t0), "report": st.get("report_md", ""), "origin": "schedule", "operator": s["operator"]}
                    store.push_ledger(rec)
                    store.mark_schedule_executed(s["id"], s["everyMin"])
        except Exception:
            pass
        await asyncio.sleep(15)

@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(_scheduler_daemon())
    try:
        yield
    finally:
        task.cancel()

class StartRunRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=4000)
    operator: str = Field(default="op-default", max_length=80)
    origin: Literal["manual", "schedule"] = "manual"
    liveWeb: bool = True
    autoApprove: bool = False
    modelId: Optional[str] = Field(default=None, max_length=120)

class ResumeRunRequest(BaseModel):
    action: Literal["approve", "revise", "abort"]
    revisionNotes: Optional[str] = Field(default=None, max_length=1000)

class OperatorCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)

class LtmUpsertRequest(BaseModel):
    key: str = Field(..., min_length=1, max_length=120)
    value: str = Field(..., max_length=4000)

class ScheduleCreateRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=4000)
    everyMin: int = Field(default=15, ge=5, le=60)
    operator: str = Field(default="op-default", max_length=80)

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("SWARMSYS_CORS_ORIGINS", "*").split(",") if o.strip()]

app = FastAPI(title="SwarmSys-AI Production Backend", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Accept", "Authorization"])

def _sse(p: Dict[str, Any]) -> str: return f"data: {json.dumps(p)}\n\n"

async def _stream_steps(run_id: str, init: Optional[SwarmState], resume: bool) -> AsyncGenerator[str, None]:
    if not resume:
        if len(_run_start) > 100:
            _run_start.pop(next(iter(_run_start)), None)
        if len(engine_runner._checkpoints) > 100:
            engine_runner._checkpoints.pop(next(iter(engine_runner._checkpoints)), None)
        _run_start[run_id] = int(time.time() * 1000)
        yield _sse({"type": "run_started", "runId": run_id})
    final_state: Optional[SwarmState] = None
    interrupted = False
    for node_name, delta, st in engine_runner.run_until_interrupt_or_end(run_id, init, resume):
        final_state = st
        if node_name == "__interrupt__":
            interrupted = True
            yield _sse({"type": "phase", "phase": "approval", "runId": run_id})
            break
        for ev in delta.get("sse_events", []):
            yield _sse({**ev, "runId": run_id})
            if ev.get("type") == "memory" and ev.get("entry", {}).get("persisted"):
                store.upsert_ltm(st.get("operator", "op-default"), ev["entry"]["key"], ev["entry"]["value"])
            await asyncio.sleep(0.01)
    if final_state and not interrupted and final_state.get("report_md"):
        wall_ms = max(80, int(time.time() * 1000) - _run_start.get(run_id, int(time.time() * 1000)))
        score = int(final_state.get("review_score", 94))
        rec = {"id": run_id, "task": final_state.get("task", ""), "domain": final_state.get("domain", "production-engineering"), "score": score, "at": int(time.time() * 1000), "wallMs": wall_ms, "report": final_state["report_md"], "origin": final_state.get("origin", "manual"), "operator": final_state.get("operator", "op-default")}
        store.push_ledger(rec)
        yield _sse({"type": "report", "runId": run_id, "md": final_state["report_md"], "score": score, "wallMs": wall_ms})
        yield _sse({"type": "complete", "runId": run_id, "record": rec})

@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "service": "swarmsys-ai-backend", "langgraph_ready": build_swarm_graph() is not None}

@app.post("/api/runs/stream")
async def start_run_stream(req: StartRunRequest) -> StreamingResponse:
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    init: SwarmState = {"run_id": run_id, "task": req.task, "operator": req.operator, "origin": req.origin, "live_web": req.liveWeb, "auto_approve": req.autoApprove, "inference_model": req.modelId or "Qwen/Qwen3.5-27B-Instruct", "human_approved": req.autoApprove}
    return StreamingResponse(_stream_steps(run_id, init, False), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Run-Id": run_id})

@app.post("/api/runs/{run_id}/resume")
async def resume_run_stream(run_id: str, req: ResumeRunRequest) -> StreamingResponse:
    if run_id not in engine_runner._checkpoints:
        raise HTTPException(status_code=404, detail="Run checkpoint not found")
    if req.action == "abort":
        engine_runner._checkpoints.pop(run_id, None)
        async def _ab(): yield _sse({"type": "aborted", "runId": run_id})
        return StreamingResponse(_ab(), media_type="text/event-stream")
    cp = engine_runner._checkpoints[run_id]
    cp["human_approved"] = (req.action == "approve")
    if req.action == "revise": cp["revision_notes"] = req.revisionNotes or "Revise scope"
    return StreamingResponse(_stream_steps(run_id, None, True), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Run-Id": run_id})

@app.get("/api/operators")
def get_operators() -> List[Dict[str, Any]]: return store.list_operators()

@app.post("/api/operators")
def create_operator(req: OperatorCreateRequest) -> Dict[str, Any]: return store.add_operator(req.name)

@app.get("/api/ledger/{operator_id}")
def get_ledger(operator_id: str) -> List[Dict[str, Any]]: return store.list_ledger(operator_id)

@app.get("/api/ltm/{operator_id}")
def get_ltm(operator_id: str) -> List[Dict[str, str]]: return store.list_ltm(operator_id)

@app.post("/api/ltm/{operator_id}")
def upsert_ltm(operator_id: str, req: LtmUpsertRequest) -> Dict[str, str]: return store.upsert_ltm(operator_id, req.key, req.value)

@app.delete("/api/ltm/{operator_id}")
def delete_ltm(operator_id: str) -> Dict[str, bool]:
    store.clear_ltm(operator_id)
    return {"cleared": True}

@app.get("/api/schedules")
def get_schedules() -> List[Dict[str, Any]]: return store.list_schedules()

@app.post("/api/schedules")
def create_schedule(req: ScheduleCreateRequest) -> Dict[str, Any]: return store.add_schedule(req.task, req.everyMin, req.operator)

@app.patch("/api/schedules/{schedule_id}/toggle")
def toggle_schedule(schedule_id: str) -> Dict[str, Any]:
    u = store.toggle_schedule(schedule_id)
    if not u: raise HTTPException(status_code=404, detail="Schedule not found")
    return u

@app.delete("/api/schedules/{schedule_id}")
def remove_schedule(schedule_id: str) -> Dict[str, bool]:
    store.delete_schedule(schedule_id)
    return {"deleted": True}
