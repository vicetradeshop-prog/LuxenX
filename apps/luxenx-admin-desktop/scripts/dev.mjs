/**
 * Orchestrateur de développement (LuxenX et LuxenX Admin).
 *
 * 1. Compile le processus principal Electron (esbuild).
 * 2. Démarre le serveur Vite du renderer.
 * 3. Lance Electron pointé sur l'URL réelle du serveur Vite.
 *
 * Fermer la fenêtre Electron arrête tout proprement.
 */
import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

/* --- 1. Processus principal + preload --- */
await build({
  entryPoints: ["electron/main.ts", "electron/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "electron-dist",
  outExtension: { ".js": ".cjs" },
  external: ["electron", "electron-updater"],
  sourcemap: true,
  logLevel: "warning",
});
console.log("[dev] Processus principal Electron compilé.");

/* --- 2. Serveur Vite --- */
const vite = await createServer({ configFile: "vite.config.ts" });
await vite.listen();
vite.printUrls();
const devUrl = (vite.resolvedUrls?.local?.[0] ?? "http://localhost:5173/").replace(/\/$/, "");

/* --- 3. Electron --- */
// require("electron") renvoie le chemin de l'exécutable, où que npm
// l'ait placé dans le monorepo (hoisting racine ou local).
const electronBin = require("electron");
if (typeof electronBin !== "string" || !existsSync(electronBin)) {
  console.error("[dev] Exécutable Electron introuvable. Lancez installer.bat à la racine.");
  process.exit(1);
}

const child = spawn(electronBin, ["."], {
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: devUrl, LX_DEV: "1" },
});

let closing = false;
async function shutdown(code) {
  if (closing) return;
  closing = true;
  await vite.close();
  process.exit(code);
}

child.on("exit", (code) => shutdown(code ?? 0));
child.on("error", (err) => {
  console.error(`[dev] Impossible de lancer Electron : ${err.message}`);
  shutdown(1);
});
process.on("SIGINT", () => shutdown(0));
