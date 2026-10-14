/**
 * Tests des outils Node des scripts .bat (exécutés par verifier.bat).
 * Lanceur : node --test tests/tools/
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseEnv, serializeEnv, normalizeBackendUrl } from "../../scripts/tools/env-file.mjs";

const SAMPLE = [
  "# commentaire",
  "UPSTASH_REDIS_REST_URL=",
  "BACKEND_URL=http://localhost:8787",
  "",
  "SESSION_SECRET=abc123",
].join("\n");

test("parseEnv lit les clés et ignore commentaires/lignes vides", () => {
  const values = parseEnv(SAMPLE);
  assert.equal(values.get("UPSTASH_REDIS_REST_URL"), "");
  assert.equal(values.get("BACKEND_URL"), "http://localhost:8787");
  assert.equal(values.get("SESSION_SECRET"), "abc123");
  assert.equal(values.has("#"), false);
});

test("serializeEnv remplace uniquement les clés fournies", () => {
  const values = parseEnv(SAMPLE);
  values.set("BACKEND_URL", "https://luxenx.onrender.com");
  const out = serializeEnv(SAMPLE, values);
  assert.match(out, /BACKEND_URL=https:\/\/luxenx\.onrender\.com/);
  assert.match(out, /# commentaire/);
  assert.match(out, /SESSION_SECRET=abc123/);
});

test("serializeEnv ne duplique ni ne perd aucune ligne", () => {
  const values = parseEnv(SAMPLE);
  const out = serializeEnv(SAMPLE, values);
  assert.equal(out.split("\n").length, SAMPLE.split("\n").length);
});

test("normalizeBackendUrl accepte https et http, retire le slash final", () => {
  assert.equal(normalizeBackendUrl("https://x.onrender.com/"), "https://x.onrender.com");
  assert.equal(normalizeBackendUrl("http://localhost:8787"), "http://localhost:8787");
});

test("normalizeBackendUrl refuse ftp, les chaînes vides et le texte", () => {
  assert.equal(normalizeBackendUrl("ftp://x/y"), null);
  assert.equal(normalizeBackendUrl(""), null);
  assert.equal(normalizeBackendUrl("pas une url"), null);
  assert.equal(normalizeBackendUrl(undefined), null);
});
