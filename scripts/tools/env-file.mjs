/**
 * Lecture / écriture du fichier .env — logique PURE, testée unitairement
 * (tests/tools/env-file.test.mjs, exécutée par verifier.bat).
 * Utilisée par l'assistant de configuration (setup-wizard.mjs).
 */

export function parseEnv(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

/**
 * Réécrit un .env en remplaçant UNIQUEMENT les clés fournies,
 * sans toucher aux commentaires ni à l'ordre des lignes.
 */
export function serializeEnv(baseText, values) {
  const lines = baseText.split(/\r?\n/);
  const out = lines.map((line) => {
    const m = /^([A-Z0-9_]+)\s*=/.exec(line.trim());
    if (m && values.has(m[1])) return `${m[1]}=${values.get(m[1])}`;
    return line;
  });
  return out.join("\n");
}

/** Valide et normalise une URL de backend (https ou http, sans slash final). */
export function normalizeBackendUrl(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
