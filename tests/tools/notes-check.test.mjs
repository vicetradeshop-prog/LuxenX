import test from "node:test";
import assert from "node:assert/strict";
import { hasRealNotes } from "../../scripts/tools/notes-check.mjs";

test("refuse le modèle vide tel quel", () => {
  const template = ["## Nouveautes", "", "- ", "", "## Corrections", "", "- ", ""].join("\n");
  assert.equal(hasRealNotes(template), false);
});

test("refuse un fichier vide ou absent de contenu", () => {
  assert.equal(hasRealNotes(""), false);
  assert.equal(hasRealNotes("   \n\n  \n"), false);
  assert.equal(hasRealNotes("## Seul un titre"), false);
});

test("accepte des puces rédigées", () => {
  assert.equal(hasRealNotes("## Nouveautes\n- Ajout du téléchargement spotDL\n"), true);
});

test("accepte des phrases sans puces", () => {
  assert.equal(hasRealNotes("Première version publique.\nLe backend est hébergé sur Render."), true);
});

test("accepte d'autres styles de puces et de numérotation", () => {
  assert.equal(hasRealNotes("* correction du wizard\n"), true);
  assert.equal(hasRealNotes("1. nouvel installateur\n"), true);
  assert.equal(hasRealNotes("• interface musique retravaillée\n"), true);
});

test("accepte un titre suivi de texte", () => {
  assert.equal(hasRealNotes("## Nouveautes\nCartes Microsoft 365 annoncées.\n"), true);
});
