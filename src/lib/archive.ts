/* Source archive — lazy-loaded on demand. The project's own files are
   inlined at build time via Vite `?raw` imports, so the download is a
   genuinely complete, buildable copy of the codebase. */

import rootPkg from "../../package.json?raw";
import viteCfg from "../../vite.config.js?raw";
import tsconfig from "../../tsconfig.json?raw";
import indexHtml from "../../index.html?raw";
import readme from "../../README.md?raw";
import deployWorkflow from "../../.github/workflows/deploy.yml?raw";

import mainTsx from "../main.tsx?raw";
import appTsx from "../App.tsx?raw";
import indexCss from "../index.css?raw";
import viteEnv from "../vite-env.d.ts?raw";

import archive from "./archive.ts?raw";
import engine from "./engine.ts?raw";
import knowledge from "./knowledge.ts?raw";
import pdf from "./pdf.ts?raw";
import shipkit from "./shipkit.ts?raw";
import sqlite from "./sqlite.ts?raw";
import store from "./store.ts?raw";
import types from "./types.ts?raw";
import ui from "./ui.tsx?raw";
import web from "./web.ts?raw";

import AgentRoster from "../components/AgentRoster.tsx?raw";
import ArchitectureSection from "../components/ArchitectureSection.tsx?raw";
import DossiersSection from "../components/DossiersSection.tsx?raw";
import Footer from "../components/Footer.tsx?raw";
import MemoryPanel from "../components/MemoryPanel.tsx?raw";
import NotifyToasts from "../components/NotifyToasts.tsx?raw";
import Pipeline from "../components/Pipeline.tsx?raw";
import SchedulerPanel from "../components/SchedulerPanel.tsx?raw";
import ShipSection from "../components/ShipSection.tsx?raw";
import TaskConsole from "../components/TaskConsole.tsx?raw";
import TopBar from "../components/TopBar.tsx?raw";

import { deployGuide, MANIFESTS } from "./shipkit";

const SOURCE_FILES: Record<string, string> = {
  "package.json": rootPkg,
  "vite.config.js": viteCfg,
  "tsconfig.json": tsconfig,
  "index.html": indexHtml,
  "README.md": readme,
  ".github/workflows/deploy.yml": deployWorkflow,
  "src/vite-env.d.ts": viteEnv,
  "src/main.tsx": mainTsx,
  "src/App.tsx": appTsx,
  "src/index.css": indexCss,
  "src/lib/archive.ts": archive,
  "src/lib/engine.ts": engine,
  "src/lib/knowledge.ts": knowledge,
  "src/lib/pdf.ts": pdf,
  "src/lib/shipkit.ts": shipkit,
  "src/lib/sqlite.ts": sqlite,
  "src/lib/store.ts": store,
  "src/lib/types.ts": types,
  "src/lib/ui.tsx": ui,
  "src/lib/web.ts": web,
  "src/components/AgentRoster.tsx": AgentRoster,
  "src/components/ArchitectureSection.tsx": ArchitectureSection,
  "src/components/DossiersSection.tsx": DossiersSection,
  "src/components/Footer.tsx": Footer,
  "src/components/MemoryPanel.tsx": MemoryPanel,
  "src/components/NotifyToasts.tsx": NotifyToasts,
  "src/components/Pipeline.tsx": Pipeline,
  "src/components/SchedulerPanel.tsx": SchedulerPanel,
  "src/components/ShipSection.tsx": ShipSection,
  "src/components/TaskConsole.tsx": TaskConsole,
  "src/components/TopBar.tsx": TopBar,
};

export const SOURCE_FILE_COUNT = Object.keys(SOURCE_FILES).length;

async function zipAndDownload(files: Record<string, string>, name: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 7 } });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

export function downloadSource(): Promise<void> {
  return zipAndDownload(SOURCE_FILES, "swarmsys-ai-source.zip");
}

export function downloadDeployPack(): Promise<void> {
  return zipAndDownload({ ...MANIFESTS, "DEPLOY.md": deployGuide() }, "swarmsys-ai-deploy-pack.zip");
}
