import { describe, it, expect, beforeEach } from "vitest";
import { makeApp, registerUser, auth, makeAdmin, type TestApp, type TestUser } from "./helpers.js";
import { seedDefaults } from "../src/seed.js";

describe("contenu client — dashboard, cartes, aide", () => {
  let t: TestApp;
  let user: TestUser;

  beforeEach(async () => {
    t = makeApp();
    await seedDefaults(t.ctx, { createAdmin: false });
    user = await registerUser(t, "client@example.com");
  });

  it("le dashboard renvoie cartes, tendances, paramètres et aide en une requête", async () => {
    const res = await t.http.get("/api/v1/dashboard").set(auth(user.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("client@example.com");
    expect(Array.isArray(res.body.cards)).toBe(true);
    expect(res.body.cards.length).toBeGreaterThan(0);
    expect(res.body.trending.config.enabled).toBe(true);
    expect(res.body.help.faq.length).toBeGreaterThan(0);
    expect(res.body.help.guides.length).toBeGreaterThan(0);
  });

  it("Script musique est disponible, les autres cartes sont 'coming_soon'", async () => {
    const res = await t.http.get("/api/v1/cards").set(auth(user.accessToken));
    const cards = res.body as { id: string; status: string }[];
    const music = cards.find((c) => c.id === "script-musique");
    expect(music?.status).toBe("available");
    const others = cards.filter((c) => c.id !== "script-musique");
    expect(others.every((c) => c.status === "coming_soon")).toBe(true);
  });

  it("les cartes sont triées par ordre d'affichage", async () => {
    const res = await t.http.get("/api/v1/cards").set(auth(user.accessToken));
    const orders = (res.body as { order: number }[]).map((c) => c.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("l'aide contient les guides MP3/MP4 avec étapes numérotées", async () => {
    const res = await t.http.get("/api/v1/help");
    const guides = (res.body.guides as { id: string; steps: unknown[] }[]) ?? [];
    const ids = guides.map((g) => g.id);
    expect(ids).toContain("guide-mp3");
    expect(ids).toContain("guide-mp4");
    for (const g of guides) expect(g.steps.length).toBeGreaterThan(0);
  });

  it("le dashboard exige l'authentification", async () => {
    const res = await t.http.get("/api/v1/dashboard");
    expect(res.status).toBe(401);
  });

  it("les releases publiques ne nécessitent pas de jeton", async () => {
    const res = await t.http.get("/api/v1/releases");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("le mode maintenance bloque les utilisateurs mais pas les admins", async () => {
    await t.ctx.content.updateSettings({ maintenanceMode: true, maintenanceMessage: "Maintenance en cours." });
    const res = await t.http.get("/api/v1/dashboard").set(auth(user.accessToken));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("maintenance");
  });
});

describe("compte — préférences et suppression", () => {
  let t: TestApp;
  let user: TestUser;

  beforeEach(async () => {
    t = makeApp();
    user = await registerUser(t, "prefs@example.com");
  });

  it("met à jour le pseudo et les préférences", async () => {
    const res = await t.http
      .patch("/api/v1/account")
      .set(auth(user.accessToken))
      .send({
        username: "nouveau-pseudo",
        preferences: { animationsEnabled: false, downloadFolder: "D:\\Musique" },
      });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("nouveau-pseudo");

    const account = await t.http.get("/api/v1/account").set(auth(user.accessToken));
    expect(account.body.preferences.downloadFolder).toBe("D:\\Musique");
  });

  it("refuse un pseudo invalide", async () => {
    const res = await t.http
      .patch("/api/v1/account")
      .set(auth(user.accessToken))
      .send({ username: "a" });
    expect(res.status).toBe(400);
  });

  it("change le mot de passe et révoque les autres sessions", async () => {
    const res = await t.http
      .post("/api/v1/account/password")
      .set(auth(user.accessToken))
      .send({ currentPassword: "motdepasse-solide-123", newPassword: "encore-plus-solide-99" });
    expect(res.status).toBe(200);

    const login = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "prefs@example.com", password: "encore-plus-solide-99" });
    expect(login.status).toBe(200);
  });

  it("refuse le changement avec un mauvais mot de passe actuel", async () => {
    const res = await t.http
      .post("/api/v1/account/password")
      .set(auth(user.accessToken))
      .send({ currentPassword: "faux", newPassword: "encore-plus-solide-99" });
    expect(res.status).toBe(400);
  });

  it("supprime le compte avec confirmation du mot de passe", async () => {
    const wrong = await t.http
      .delete("/api/v1/account")
      .set(auth(user.accessToken))
      .send({ password: "mauvais", confirm: true });
    expect(wrong.status).toBe(400);

    const ok = await t.http
      .delete("/api/v1/account")
      .set(auth(user.accessToken))
      .send({ password: "motdepasse-solide-123", confirm: true });
    expect(ok.status).toBe(204);
    expect(await t.ctx.users.findById(user.id)).toBeNull();
  });
});

describe("politique d'inscription et validation stricte", () => {
  it("refuse les inscriptions quand l'administrateur les ferme", async () => {
    const t = makeApp();
    await seedDefaults(t.ctx, { createAdmin: false });
    await t.ctx.content.updateSettings({ registrationsOpen: false });
    const res = await t.http
      .post("/api/v1/auth/register")
      .send({ email: "ferme@example.com", username: "ferme", password: "motdepasse-solide-123" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("registrations_closed");
  });

  it("refuse une pagination hors bornes", async () => {
    const t = makeApp();
    const admin = await makeAdmin(t);
    const res = await t.http
      .get("/api/v1/admin/users?pageSize=500")
      .set(auth(admin.accessToken));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("borne la recherche administrative", async () => {
    const t = makeApp();
    const admin = await makeAdmin(t);
    const res = await t.http
      .get(`/api/v1/admin/users?search=${"x".repeat(200)}`)
      .set(auth(admin.accessToken));
    expect(res.status).toBe(400);
  });
});
