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
                CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER);
                CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, task TEXT, domain TEXT, score INTEGER, at INTEGER, wall_ms INTEGER, report TEXT, origin TEXT, operator TEXT);
                CREATE TABLE IF NOT EXISTS ltm (operator TEXT, key TEXT, value TEXT, updated_at INTEGER, PRIMARY KEY (operator, key));
                CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, task TEXT, every_min INTEGER, next_due INTEGER, runs INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, operator TEXT, created_at INTEGER);
            """)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def push_ledger(self, r: Dict[str, Any]) -> Dict[str, Any]:
        with self._conn() as c:
            c.execute("INSERT OR REPLACE INTO ledger VALUES (?,?,?,?,?,?,?,?,?)", (r["id"], r["task"], r["domain"], int(r["score"]), int(r["at"]), int(r["wallMs"]), r["report"], r["origin"], r["operator"]))
        return r

    def upsert_ltm(self, op: str, k: str, v: str) -> Dict[str, str]:
        with self._conn() as c:
            c.execute("INSERT OR REPLACE INTO ltm VALUES (?,?,?,?)", (op, k, v, int(time.time() * 1000)))
        return {"key": k, "value": v}

store = PersistentStore()
engine_runner = FallbackSwarmGraph(interrupt_for_approval=True)
_run_start: Dict[str, int] = {}

class StartRunRequest(BaseModel):
    task: str = Field(..., min_length=1)
    operator: str = "op-default"
    origin: Literal["manual", "schedule"] = "manual"
    liveWeb: bool = True
    autoApprove: bool = False
    modelId: Optional[str] = None

class ResumeRunRequest(BaseModel):
    action: Literal["approve", "revise", "abort"]
    revisionNotes: Optional[str] = None

app = FastAPI(title="SwarmSys-AI Production Backend", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def _sse(p: Dict[str, Any]) -> str: return f"data: {json.dumps(p)}\n\n"

async def _stream_steps(run_id: str, init: Optional[SwarmState], resume: bool) -> AsyncGenerator[str, None]:
    if not resume:
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
