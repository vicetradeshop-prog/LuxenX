import { describe, it, expect } from "vitest";
import { makeApp } from "./helpers.js";

describe("CORS", () => {
  it("autorise l'origine du renderer Vite en développement", async () => {
    const t = makeApp();
    const res = await t.http.get("/api/v1/health").set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("répond aux préflights OPTIONS du renderer", async () => {
    const t = makeApp();
    const res = await t.http
      .options("/api/v1/auth/login")
      .set("Origin", "http://localhost:5174")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,authorization");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("refuse une origine distante non configurée", async () => {
    const t = makeApp();
    const res = await t.http.get("/api/v1/health").set("Origin", "https://malveillant.example");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("autorise les clients natifs sans origine (app packagée)", async () => {
    const t = makeApp();
    const res = await t.http.get("/api/v1/health");
    expect(res.status).toBe(200);
  });
});
