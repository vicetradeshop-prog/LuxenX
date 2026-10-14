import test from "node:test";
import assert from "node:assert/strict";
import { nextFree, bump, parseSemver } from "../../scripts/tools/next-free-version.mjs";

test("parseSemver et bump", () => {
  assert.deepEqual(parseSemver("1.2.3"), { major: 1, minor: 2, patch: 3 });
  assert.equal(bump("1.2.3", "patch"), "1.2.4");
  assert.equal(bump("1.2.3", "minor"), "1.3.0");
  assert.equal(bump("1.2.3", "major"), "2.0.0");
});

test("nextFree saute les versions déjà publiées", () => {
  const tags = ["v0.1.1", "v0.2.0", "v0.2.1"];
  // base locale 0.1.1, patch -> 0.1.2 libre
  assert.equal(nextFree("0.1.1", "patch", tags), "0.1.2");
  // base locale 0.2.0, patch -> 0.2.1 occupée -> 0.2.2
  assert.equal(nextFree("0.2.0", "patch", tags), "0.2.2");
  // base locale 0.2.1, minor -> 0.3.0 libre
  assert.equal(nextFree("0.2.1", "minor", tags), "0.3.0");
});

test("nextFree avec aucune release existante", () => {
  assert.equal(nextFree("0.1.0", "patch", []), "0.1.1");
});

test("nextFree accepte des tags sans préfixe v", () => {
  assert.equal(nextFree("0.2.0", "patch", ["0.2.1"]), "0.2.2");
});
