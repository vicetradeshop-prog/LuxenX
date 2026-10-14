/**
 * Contrôle de structure : vérifie la présence de tous les fichiers
 * indispensables au projet (applications, backend, scripts, docs,
 * configurations d'exemple). Utilisé par verifier.bat.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  // Racine
  "package.json", "tsconfig.base.json", ".gitignore", ".env.example",
  "README-FR.md", "eslint.config.mjs", "render.yaml", ".nvmrc",
  // Scripts .bat (racine + scripts/)
  "installer.bat", "lancer.bat", "verifier.bat", "construire.bat",
  "publier.bat", "deployer-backend.bat", "diagnostic.bat",
  "scripts/installer.bat", "scripts/lancer.bat", "scripts/verifier.bat",
  "scripts/construire.bat", "scripts/publier.bat", "scripts/deployer-backend.bat",
  "scripts/diagnostic.bat", "scripts/_common.bat", "scripts/assistant-config.bat",
  "scripts/_backend-window.bat", "scripts/_admin-window.bat",
  "scripts/tools/setup-wizard.mjs", "scripts/tools/bump-version.mjs",
  "scripts/tools/render-deploy.mjs", "scripts/tools/diagnostic.mjs",
  "scripts/tools/backend-seed.mjs", "scripts/tools/env-file.mjs", "scripts/tools/notes-check.mjs",
  "scripts/tools/backend-running.mjs",
  "scripts/tools/next-free-version.mjs", "tests/tools/next-free-version.test.mjs",
  "tests/tools/notes-check.test.mjs",
  "tests/tools/env-file.test.mjs",
  // Packages
  "packages/shared/package.json", "packages/shared/src/index.ts",
  "packages/validation/package.json", "packages/validation/src/index.ts",
  "packages/api-client/package.json", "packages/api-client/src/index.ts",
  "packages/ui/package.json", "packages/ui/src/index.ts",
  "packages/ui/styles/luxenx.css",
  // Backend
  "apps/backend/package.json", "apps/backend/src/index.ts", "apps/backend/src/app.ts",
  "apps/backend/src/config.ts", "apps/backend/src/seed.ts",
  "apps/backend/tests/auth.test.ts", "apps/backend/tests/admin.test.ts",
  "apps/backend/tests/content.test.ts",
  // LuxenX
  "apps/luxenx-desktop/package.json", "apps/luxenx-desktop/electron-builder.yml",
  "apps/luxenx-desktop/electron/main.ts", "apps/luxenx-desktop/electron/preload.ts",
  "apps/luxenx-desktop/src/App.tsx", "apps/luxenx-desktop/src/main.tsx",
  "apps/luxenx-desktop/installer/icon.png", "apps/luxenx-desktop/installer/icon.ico",
  "apps/luxenx-desktop/installer/ACCORD-DONNEES.txt",
  // LuxenX Admin
  "apps/luxenx-admin-desktop/package.json", "apps/luxenx-admin-desktop/electron-builder.yml",
  "apps/luxenx-admin-desktop/electron/main.ts", "apps/luxenx-admin-desktop/electron/preload.ts",
  "apps/luxenx-admin-desktop/src/App.tsx", "apps/luxenx-admin-desktop/src/main.tsx",
  "apps/luxenx-admin-desktop/installer/icon.png", "apps/luxenx-admin-desktop/installer/icon.ico",
  // Docs
  "docs/ARCHITECTURE.md", "docs/SECURITY.md", "docs/PUBLISHING.md",
  "docs/PRIVACY-DATA.md",
];

let missing = 0;
for (const rel of REQUIRED) {
  const full = path.join(root, rel);
  if (!existsSync(full) || !statSync(full).isFile()) {
    console.error(`[MANQUANT] ${rel}`);
    missing++;
  }
}

if (missing === 0) {
  console.log(`Controle de structure : ${REQUIRED.length} fichiers essentiels presents.`);
  process.exit(0);
}
console.error(`Controle de structure : ${missing} fichier(s) manquant(s).`);
process.exit(1);
