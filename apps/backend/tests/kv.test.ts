import { describe, it, expect } from "vitest";
import { normalizeUpstashValue, MemoryKv } from "../src/lib/kv.js";

describe("normalisation des valeurs Upstash", () => {
  it("conserve les chaînes telles quelles", () => {
    expect(normalizeUpstashValue("texte")).toBe("texte");
    expect(normalizeUpstashValue('{"a":1}')).toBe('{"a":1}');
  });

  it("re-sérialise les objets désérialisés par Upstash", () => {
    // Cas réel du bug : Upstash rend un objet, on doit retrouver la chaîne JSON.
    expect(normalizeUpstashValue({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });

  it("re-sérialise les nombres et booléens", () => {
    expect(normalizeUpstashValue(123)).toBe("123");
    expect(normalizeUpstashValue(true)).toBe("true");
  });

  it("gère null/undefined", () => {
    expect(normalizeUpstashValue(null)).toBeNull();
    expect(normalizeUpstashValue(undefined)).toBeNull();
  });
});

describe("MemoryKv (référence de comportement)", () => {
  it("fait un aller-retour fidèle pour un JSON", async () => {
    const kv = new MemoryKv();
    const payload = JSON.stringify({ maintenanceMode: false, announcements: [] });
    await kv.set("cle", payload);
    expect(await kv.get("cle")).toBe(payload);
    expect(JSON.parse((await kv.get("cle")) ?? "")).toEqual({ maintenanceMode: false, announcements: [] });
  });
});
