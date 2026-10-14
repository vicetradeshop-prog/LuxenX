/**
 * Assistant de configuration guidée (double-cliquable via installer.bat
 * ou scripts/assistant-config.bat).
 *
 * - Lit .env s'il existe (jamais écrasé sans accord).
 * - Pose les questions essentielles : Upstash, URL backend, secret de
 *   session (généré automatiquement), compte admin initial, GitHub.
 * - Teste la connexion Upstash via l'API REST (aucune donnée fictive
 *   n'est présentée comme fonctionnelle).
 */
import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parseEnv, serializeEnv, normalizeBackendUrl } from "./env-file.mjs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = path.join(root, ".env");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

async function testUpstash(url, token) {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const body = await res.text();
      return { ok: /PONG/i.test(body), detail: body.slice(0, 60) };
    }
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

async function main() {
  console.log("");
  console.log("==========================================================");
  console.log(" Assistant de configuration LuxenX");
  console.log("==========================================================");
  console.log(" Reponses vides = conserver la valeur actuelle.");
  console.log("");

  let base = "";
  let values = new Map();
  if (existsSync(envPath)) {
    base = readFileSync(envPath, "utf8");
    values = parseEnv(base);
    console.log(` .env existant detecte : les valeurs actuelles sont proposees.`);
  } else {
    base = readFileSync(path.join(root, ".env.example"), "utf8");
    values = parseEnv(base);
    writeFileSync(envPath, base, "utf8");
    console.log(` .env cree depuis .env.example.`);
  }

  /* --- Upstash --- */
  console.log("");
  console.log(" -- Upstash Redis (obligatoire pour le backend) ------------");
  console.log("    1. Console Upstash : https://console.upstash.com > Create database");
  console.log("    2. Ouvrez la base > onglet « REST API »");
  console.log("    3. Copiez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN");
  let url = await ask(`    URL REST [${values.get("UPSTASH_REDIS_REST_URL") || "vide"}] : `);
  let token = await ask(`    Jeton REST [${values.get("UPSTASH_REDIS_REST_TOKEN") ? "masqué" : "vide"}] : `);
  if (url) values.set("UPSTASH_REDIS_REST_URL", url);
  if (token) values.set("UPSTASH_REDIS_REST_TOKEN", token);

  const finalUrl = values.get("UPSTASH_REDIS_REST_URL") || "";
  const finalToken = values.get("UPSTASH_REDIS_REST_TOKEN") || "";
  if (finalUrl && finalToken) {
    process.stdout.write("    Test de la connexion Upstash... ");
    const t = await testUpstash(finalUrl, finalToken);
    console.log(t.ok ? "OK (PONG)" : `ECHEC (${t.detail})`);
    if (!t.ok) {
      console.log("    Le backend demarrera en mode memoire volatile jusqu'a correction.");
    }
  } else {
    console.log("    [!] Upstash non configure : le backend utilisera une memoire");
    console.log("        VOLATILE (developpement uniquement, donnees perdues au reboot).");
  }

  /* --- Backend --- */
  console.log("");
  console.log(" -- Backend ------------------------------------------------");
  const backend = await ask(`    URL publique du backend [${values.get("BACKEND_URL") || "http://localhost:8787"}] : `);
  if (backend) {
    const normalized = normalizeBackendUrl(backend);
    if (normalized) values.set("BACKEND_URL", normalized);
    else console.log("    [!] URL invalide : valeur ignoree.");
  }

  if (!values.get("SESSION_SECRET")) {
    const secret = randomBytes(48).toString("hex");
    values.set("SESSION_SECRET", secret);
    console.log("    SESSION_SECRET genere automatiquement (96 caracteres hex).");
  } else {
    console.log("    SESSION_SECRET deja present : conserve.");
  }

  /* --- Administrateur initial --- */
  console.log("");
  console.log(" -- Compte administrateur initial (LuxenX Admin) -----------");
  const adminEmail = await ask(`    Adresse admin [${values.get("ADMIN_EMAIL") || "vide"}] : `);
  if (adminEmail) values.set("ADMIN_EMAIL", adminEmail);
  if (values.get("ADMIN_EMAIL")) {
    const adminPwd = await ask("    Mot de passe admin (10 caractères min, masqué) : ");
    if (adminPwd) {
      if (adminPwd.length < 10) {
        console.log("    [!] Trop court : valeur ignoree.");
      } else {
        values.set("ADMIN_PASSWORD", adminPwd);
        console.log("    Le compte sera cree par le seed (etape suivante).");
      }
    }
  }

  /* --- GitHub --- */
  console.log("");
  console.log(" -- GitHub (publication des mises a jour) ------------------");
  const owner = await ask(`    Proprietaire du depot (votre compte GitHub) [${values.get("GITHUB_OWNER") || "vide"}] : `);
  if (owner) values.set("GITHUB_OWNER", owner);
  const repo = await ask(`    Nom du depot [${values.get("GITHUB_REPO") || "LuxenX"}] : `);
  if (repo) values.set("GITHUB_REPO", repo);
  console.log("    Authentification recommandee : GitHub CLI (gh auth login).");
  console.log("    Un jeton GITHUB_TOKEN n'est utile que pour le backend.");

  /* --- Render (hébergement du backend) --- */
  console.log("");
  console.log(" -- Render : hebergement du backend (recommande) ------------");
  console.log("    Le backend doit etre en ligne pour que vos utilisateurs");
  console.log("    puissent se connecter depuis n'importe quel ordinateur.");
  console.log("    1. dashboard.render.com > New > Web Service > votre depot Git");
  console.log("    2. Copiez l'URL EXACTE en haut de la page du service,");
  console.log("       ex. https://luxenx.onrender.com - pas un nom devine !");
  console.log("    3. Render > Account > API Keys : creez une cle si vous voulez");
  console.log("     que deployer-backend.bat declenche les deploiements tout seul.");
  console.log("    4. L'ID du service se trouve dans l'URL de sa page Render.");
  const renderUrl = await ask("    URL publique du service Render (BACKEND_URL) [vide = local] : ");
  if (renderUrl) {
    const normalized = normalizeBackendUrl(renderUrl);
    if (normalized && normalized.startsWith("https://")) {
      values.set("BACKEND_URL", normalized);
      console.log("    Les installateurs produits pointeront vers cette adresse.");
    } else {
      console.log("    [!] URL Render invalide (https:// attendu) : BACKEND_URL conserve.");
    }
  }
  const renderKey = await ask("    RENDER_API_KEY (optionnel, pour deploiement auto) [vide] : ");
  if (renderKey) values.set("RENDER_API_KEY", renderKey);
  const renderSvc = await ask("    RENDER_SERVICE_ID (optionnel) [vide] : ");
  if (renderSvc) values.set("RENDER_SERVICE_ID", renderSvc);

  /* --- Écriture --- */
  writeFileSync(envPath, serializeEnv(base, values), "utf8");
  console.log("");
  console.log(" Configuration enregistree dans .env (secrets jamais affiches).");
  console.log("==========================================================");
  rl.close();
}

main().catch((err) => {
  console.error("Erreur de l'assistant :", err.message);
  rl.close();
  process.exit(1);
});
