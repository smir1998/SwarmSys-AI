/* Ship kit — deploy manifests, targets and the checklist.
   The heavy source archive (raw file inlining + jszip) lives in
   archive.ts and is only pulled in when a download is requested. */

export const MANIFESTS: Record<string, string> = {
  "vercel.json": JSON.stringify(
    {
      buildCommand: "npm run build",
      outputDirectory: "dist",
      framework: "vite",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
    null,
    2,
  ),
  "netlify.toml": `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`,
  "render.yaml": `services:
  - type: web
    name: swarmsys-ai
    runtime: static
    buildCommand: npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
`,
  Dockerfile: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`,
  "nginx.conf": `server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
`,
  "Dockerfile.api": `# Optional: the LangGraph production port (FastAPI)
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
`,
  "requirements.txt": `langgraph>=0.2
langchain>=0.3
langchain-openai>=0.2
fastapi>=0.115
uvicorn[standard]>=0.30
chromadb>=0.5
python-dotenv>=1.0
`,
};

export const DEPLOY_TARGETS: { id: string; label: string; commands: string[]; note: string }[] = [
  {
    id: "vercel",
    label: "Vercel",
    commands: ["npm i -g vercel", "vercel --prod"],
    note: "vercel.json included — zero-config after the first link",
  },
  {
    id: "netlify",
    label: "Netlify",
    commands: ["npm run build", "npx netlify-cli deploy --prod --dir=dist"],
    note: "netlify.toml included — or drag dist/ into the web UI",
  },
  {
    id: "ghpages",
    label: "GitHub Pages · Actions",
    commands: ["git push origin main", "# Settings → Pages → Source: GitHub Actions"],
    note: ".github/workflows/deploy.yml ships it — zero-downtime on every push",
  },
  {
    id: "render",
    label: "Render",
    commands: ["# push the repo, then:", "# New → Static Site → build: npm run build · publish: dist"],
    note: "render.yaml included for infra-as-code deploys",
  },
  {
    id: "docker",
    label: "Docker / VPS",
    commands: ["docker build -t swarmsys-ai .", "docker run -d -p 8080:80 swarmsys-ai"],
    note: "Dockerfile + nginx.conf included — any box with Docker",
  },
  {
    id: "spaces",
    label: "HF Spaces",
    commands: ["npm run build", "# new Space → SDK: Static → upload dist/"],
    note: "free hosting next to the models the swarm references",
  },
];

export const SHIP_CHECKLIST: { id: string; label: string; detail: string }[] = [
  { id: "preset", label: "Run a preset case end-to-end", detail: "confirm the full 8-agent pipeline completes with a report" },
  { id: "build", label: "npm run build — zero errors", detail: "the production bundle is what ships" },
  { id: "preview", label: "Smoke-test the dist build", detail: "npm run preview · exercise gate, abort, ledger, PDF" },
  { id: "target", label: "Pick a target & add its manifest", detail: "vercel.json / netlify.toml / Dockerfile — download pack below" },
  { id: "deploy", label: "Deploy", detail: "use the command cards, or the platform's git integration" },
  { id: "verify", label: "Verify in production", detail: "run one preset live · reload · ledger & LTM must persist" },
  { id: "llm", label: "Swap in real LLM nodes", detail: "optional: port via the LangGraph graph.py skeleton" },
];

export function deployGuide(): string {
  return [
    "# SwarmSys AI — deploy pack",
    "",
    "This archive contains every manifest needed to ship the console:",
    "",
    ...Object.keys(MANIFESTS).map((f) => `- \`${f}\``),
    "",
    "## Primary path — GitHub Actions (zero-config)",
    "",
    "1. Push the repo to GitHub (`git push origin main`)",
    "2. Repo → Settings → Pages → Source: **GitHub Actions**",
    "3. `.github/workflows/deploy.yml` builds and publishes on every push:",
    "   `https://<your-username>.github.io/<repo>/`",
    "",
    "## Alternative targets (static console)",
    "",
    "1. `npm install && npm run build` in the source project",
    "2. Copy the manifest for your target next to `package.json`",
    "3. Deploy `dist/` — the build is fully static, no server or keys required",
    "",
    "## Production port (LangGraph + FastAPI)",
    "",
    "Use `Dockerfile.api` + `requirements.txt` with the `workflows/graph.py`",
    "skeleton from the Ship It panel. Wire real LLM nodes into the eight",
    "agent functions; topology, memory contracts and gates carry over unchanged.",
    "",
  ].join("\n");
}

/* file count for the source archive (kept in sync with lib/archive.ts) */
export const SOURCE_FILE_COUNT = 31;

export function triggerDownload(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}
