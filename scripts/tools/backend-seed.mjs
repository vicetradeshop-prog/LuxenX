/**
 * Initialise le backend : contenu par défaut + compte administrateur.
 * Utilisé par installer.bat et deployer-backend.bat.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const result = spawnSync("npm", ["run", "seed", "--workspace", "apps/backend"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
