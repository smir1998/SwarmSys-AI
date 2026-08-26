/* Embedded SQL engine — the swarm's sql_query tool executes real
   SELECT statements against a seeded ledger database. Supports
   column lists / COUNT(*), WHERE = and LIKE, ORDER BY and LIMIT. */

interface DbTable {
  name: string;
  cols: string[];
  rows: (string | number)[][];
}

const DAY = 86_400_000;

export function seedDb(): DbTable[] {
  const now = Date.now();
  return [
    {
      name: "runs",
      cols: ["id", "task", "domain", "score", "at"],
      rows: [
        ["run-101", "spam email classifier v1", "spam", 87, now - DAY * 6],
        ["run-102", "support ticket triage bot", "chatbot", 90, now - DAY * 4],
        ["run-103", "faq retrieval assistant", "rag", 92, now - DAY * 3],
        ["run-104", "review sentiment board", "sentiment", 84, now - DAY * 2],
        ["run-105", "news digest scraper", "crawler", 81, now - DAY],
        ["run-106", "demand forecast baseline", "forecast", 88, now - DAY / 2],
      ],
    },
    {
      name: "agents",
      cols: ["id", "name", "role"],
      rows: [
        ["a1", "planner", "decompose & assign"],
        ["a2", "research", "evidence & memory"],
        ["a3", "coder", "implementation & tests"],
        ["a4", "reviewer", "quality gate"],
        ["a5", "reporter", "documentation"],
      ],
    },
  ];
}

export interface SqlResult {
  cols: string[];
  rows: (string | number)[][];
  ms: number;
  error?: string;
}

export function execSQL(sql: string): SqlResult {
  const t0 = performance.now();
  try {
    const m = sql.match(
      /^\s*SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(\s+DESC)?)?(?:\s+LIMIT\s+(\d+))?\s*;?\s*$/i,
    );
    if (!m) throw new Error("only SELECT … FROM … [WHERE] [ORDER BY] [LIMIT] is supported");
    const [, selRaw, table, whereRaw, orderCol, desc, limit] = m;

    const t = seedDb().find((x) => x.name.toLowerCase() === table.toLowerCase());
    if (!t) throw new Error(`no table '${table}' (tables: runs, agents)`);

    let idxs = t.rows.map((_, i) => i);

    if (whereRaw) {
      const w = whereRaw.match(/^(\w+)\s*(=|LIKE)\s*'([^']*)'$/i);
      if (!w) throw new Error("WHERE supports col = '…' or col LIKE '…'");
      const ci = t.cols.indexOf(w[1]);
      if (ci < 0) throw new Error(`no column '${w[1]}'`);
      const needle = w[3].toLowerCase();
      idxs = idxs.filter((i) => {
        const v = String(t.rows[i][ci]).toLowerCase();
        return w[2].toUpperCase() === "LIKE" ? v.includes(needle) : v === needle;
      });
    }

    const count = /^\s*COUNT\(\*\)\s*(?:AS\s+(\w+))?\s*$/i.exec(selRaw);
    if (count) {
      return { cols: [count[1] ?? "count"], rows: [[idxs.length]], ms: Math.max(1, Math.round(performance.now() - t0)) };
    }

    const cols = selRaw.trim() === "*" ? [...t.cols] : selRaw.split(",").map((s) => s.trim());
    const cis = cols.map((c) => t.cols.indexOf(c));
    if (cis.some((i) => i < 0)) throw new Error(`unknown column in '${selRaw}'`);

    if (orderCol) {
      const oi = t.cols.indexOf(orderCol);
      if (oi >= 0) {
        idxs = [...idxs].sort((a, b) => {
          const va = t.rows[a][oi];
          const vb = t.rows[b][oi];
          return (va > vb ? 1 : va < vb ? -1 : 0) * (desc ? -1 : 1);
        });
      }
    }
    if (limit) idxs = idxs.slice(0, parseInt(limit, 10));

    return { cols, rows: idxs.map((i) => cis.map((ci) => t.rows[i][ci])), ms: Math.max(1, Math.round(performance.now() - t0)) };
  } catch (e) {
    return { cols: [], rows: [], ms: 1, error: e instanceof Error ? e.message : "query failed" };
  }
}
