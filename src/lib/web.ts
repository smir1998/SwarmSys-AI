import type { WebSource } from "./types";

/* Live external APIs — CORS-enabled, no keys required.
   The research agent calls these for real evidence; on any
   failure the swarm falls back to its offline knowledge base. */

async function getJSON(url: string, timeoutMs = 6500): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/* Wikipedia search — https://en.wikipedia.org/w/api.php (origin=* enables CORS) */
export async function searchWikipedia(query: string): Promise<WebSource[]> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
    encodeURIComponent(query) +
    "&srlimit=3&format=json&origin=*";
  const json = (await getJSON(url)) as {
    query?: { search?: { title: string; pageid: number; snippet: string }[] };
  };
  const hits = json?.query?.search ?? [];
  return hits.map((h) => ({
    title: h.title,
    url: `https://en.wikipedia.org/?curid=${h.pageid}`,
    snippet: h.snippet.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 180),
    kind: "wiki" as const,
  }));
}

/* GitHub repository search — https://api.github.com (unauthenticated, rate-limited) */
export async function searchGitHub(query: string): Promise<WebSource[]> {
  const url =
    "https://api.github.com/search/repositories?q=" +
    encodeURIComponent(query) +
    "&sort=stars&order=desc&per_page=3";
  const json = (await getJSON(url)) as {
    items?: { full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null }[];
  };
  const items = json?.items ?? [];
  return items.map((r) => ({
    title: r.full_name,
    url: r.html_url,
    snippet: (r.description ?? "").slice(0, 180),
    kind: "github" as const,
    meta: `★ ${r.stargazers_count.toLocaleString("en-US")} · ${r.language ?? "—"}`,
  }));
}

/* derive search keywords from a free-form task */
const STOP = new Set(
  "a an the and or of to for with build create make me my our their in on at by using use that this is are be it its as from".split(" "),
);

export function taskKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 3);
}
