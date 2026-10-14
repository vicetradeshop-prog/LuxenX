/**
 * Contrôle des notes de version pour publier.bat.
 *
 * Accepte TOUTE rédaction réelle (phrases, puces -, *, •, nombres,
 * titres suivis de texte) et refuse uniquement un fichier resté
 * identique au modèle vide (puces nues, aucun contenu).
 *
 * Usage CLI : node notes-check.mjs <chemin RELEASE-NOTES.md>
 *   exit 0 = notes valides, exit 1 = notes vides/modèle non rempli.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function hasRealNotes(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;                                   // ligne vide
    if (/^#{1,6}\s/.test(line)) continue;                  // titre seul
    if (/^[-*•]+$/.test(line)) continue;                   // puce nue du modèle
    if (/^[-*•]\s*$/.test(line)) continue;                 // puce + espace
    if (/^\(-?\s*\)$/.test(line)) continue;                // parenthèse vide
    if (/^[-=_*]{3,}$/.test(line)) continue;               // séparateur
    if (/^\(.*remplacer.*\)$/i.test(line)) continue;        // placeholder guidé
    if (/^\(.*laisser cette ligne.*\)$/i.test(line)) continue;
    return true;                                           // premier contenu réel
  }
  return false;
}

// Partie CLI : exécutée uniquement quand le fichier est lancé directement
// (jamais quand il est importé par un test).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage : notes-check.mjs <fichier>");
    process.exit(2);
  }
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    console.error(`Impossible de lire ${file}`);
    process.exit(1);
  }
  process.exit(hasRealNotes(content) ? 0 : 1);
}
