/**
 * Garde anti-récidive du crash « Cannot find module 'electron-updater' » :
 * chaque module déclaré EXTERNE à la compilation esbuild d'une application
 * Electron doit être une dépendance EMBARQUÉE (dependencies) de cette app,
 * sinon il manquera dans l'asar packagé.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

for (const app of ["apps/luxenx-desktop", "apps/luxenx-admin-desktop"]) {
  test(`${app} : tous les modules externes sont des dépendances embarquées`, () => {
    const buildScript = readFileSync(path.join(root, app, "scripts", "build-electron.mjs"), "utf8");
    const match = /external:\s*\[([^\]]+)\]/.exec(buildScript);
    assert.ok(match, "liste external introuvable dans build-electron.mjs");
    const externals = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const pkg = JSON.parse(readFileSync(path.join(root, app, "package.json"), "utf8"));
    const deps = pkg.dependencies ?? {};
    for (const ext of externals) {
      if (ext === "electron") continue; // fourni par le runtime Electron
      assert.ok(
        deps[ext],
        `Module externe "${ext}" absent des dependencies de ${app} : crash garanti au démarrage packagé`,
      );
    }
  });
}
