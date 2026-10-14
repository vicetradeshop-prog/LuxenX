/**
 * Compilation du processus principal et du preload pour la production,
 * + intégration de l'adresse du backend par défaut.
 *
 * L'adresse BACKEND_URL du .env racine est écrite dans
 * electron-dist/default-backend.json : les installateurs produits
 * pointeront ainsi automatiquement vers le backend hébergé (Render),
 * sans que l'utilisateur ait quoi que ce soit à configurer.
 * En développement, le défaut reste http://localhost:8787.
 */
import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

await build({
  entryPoints: ["electron/main.ts", "electron/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "electron-dist",
  outExtension: { ".js": ".cjs" },
  external: ["electron", "electron-updater"],
  minify: false,
  sourcemap: false,
  logLevel: "info",
});

let backendUrl = "http://localhost:8787";
const envPath = path.resolve(process.cwd(), "..", "..", ".env");
if (existsSync(envPath)) {
  const m = /^BACKEND_URL=(.*)$/m.exec(readFileSync(envPath, "utf8"));
  const v = m?.[1]?.trim();
  if (v && /^https?:\/\//.test(v)) backendUrl = v.replace(/\/$/, "");
}
writeFileSync(
  path.join("electron-dist", "default-backend.json"),
  JSON.stringify({ backendUrl }, null, 2),
  "utf8",
);

console.log("[luxenx] processus principal compilé dans electron-dist/");
console.log(`[luxenx] adresse backend par défaut intégrée : ${backendUrl}`);
