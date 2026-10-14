import { describe, it, expect, beforeEach } from "vitest";
import { makeApp, registerUser, makeAdmin, auth, type TestApp, type TestUser } from "./helpers.js";

describe("administration — permissions", () => {
  let t: TestApp;
  let admin: TestUser;
  let user: TestUser;

  beforeEach(async () => {
    t = makeApp();
    admin = await makeAdmin(t);
    user = await registerUser(t, "user-simple@example.com");
  });

  it("un compte normal reçoit 403 sur toutes les routes admin", async () => {
    const routes = [
      ["get", "/api/v1/admin/stats"],
      ["get", "/api/v1/admin/users"],
      ["get", "/api/v1/admin/cards"],
      ["get", "/api/v1/admin/trending"],
      ["get", "/api/v1/admin/releases"],
      ["get", "/api/v1/admin/audit"],
    ] as const;
    for (const [method, path] of routes) {
      const res = await t.http[method](path).set(auth(user.accessToken));
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(403);
      expect(res.body.error.code).toBe("forbidden");
    }
  });

  it("sans jeton : 401", async () => {
    const res = await t.http.get("/api/v1/admin/stats");
    expect(res.status).toBe(401);
  });

  it("un admin accède aux statistiques réelles", async () => {
    const res = await t.http.get("/api/v1/admin/stats").set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(2); // admin + user
    expect(typeof res.body.redisOk).toBe("boolean");
  });
});

describe("administration — comptes", () => {
  let t: TestApp;
  let admin: TestUser;
  let user: TestUser;

  beforeEach(async () => {
    t = makeApp();
    admin = await makeAdmin(t);
    user = await registerUser(t, "compte-test@example.com");
  });

  it("liste les comptes avec pagination réelle", async () => {
    const res = await t.http
      .get("/api/v1/admin/users?page=1&pageSize=1")
      .set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(2);

    const page2 = await t.http
      .get("/api/v1/admin/users?page=2&pageSize=1")
      .set(auth(admin.accessToken));
    expect(page2.body.items[0].id).not.toBe(res.body.items[0].id);
  });

  it("recherche un compte par email ou pseudo", async () => {
    const res = await t.http
      .get("/api/v1/admin/users?search=compte-test")
      .set(auth(admin.accessToken));
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe("compte-test@example.com");
  });

  it("désactive un compte : accès immédiatement bloqué + sessions révoquées", async () => {
    const patch = await t.http
      .patch(`/api/v1/admin/users/${user.id}`)
      .set(auth(admin.accessToken))
      .send({ status: "disabled" });
    expect(patch.status).toBe(200);
    expect(patch.body.status).toBe("disabled");

    const me = await t.http.get("/api/v1/auth/me").set(auth(user.accessToken));
    // Session révoquée (401) ou compte désactivé (403) : les deux bloquent l'accès.
    expect([401, 403]).toContain(me.status);

    const login = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "compte-test@example.com", password: "motdepasse-solide-123" });
    expect(login.status).toBe(403);
  });

  it("réactive un compte", async () => {
    await t.ctx.users.update(user.id, { status: "disabled" });
    const patch = await t.http
      .patch(`/api/v1/admin/users/${user.id}`)
      .set(auth(admin.accessToken))
      .send({ status: "active" });
    expect(patch.body.status).toBe("active");
    const login = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "compte-test@example.com", password: "motdepasse-solide-123" });
    expect(login.status).toBe(200);
  });

  it("révoque toutes les sessions d'un compte", async () => {
    const res = await t.http
      .delete(`/api/v1/admin/users/${user.id}/sessions`)
      .set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.revoked).toBeGreaterThanOrEqual(1);
    const me = await t.http.get("/api/v1/auth/me").set(auth(user.accessToken));
    expect(me.status).toBe(401);
  });

  it("supprime un compte", async () => {
    const del = await t.http
      .delete(`/api/v1/admin/users/${user.id}`)
      .set(auth(admin.accessToken));
    expect(del.status).toBe(204);
    expect(await t.ctx.users.findById(user.id)).toBeNull();
  });

  it("un admin ne peut pas se désactiver ni se supprimer lui-même", async () => {
    const self1 = await t.http
      .patch(`/api/v1/admin/users/${admin.id}`)
      .set(auth(admin.accessToken))
      .send({ status: "disabled" });
    expect(self1.status).toBe(400);

    const self2 = await t.http
      .delete(`/api/v1/admin/users/${admin.id}`)
      .set(auth(admin.accessToken));
    expect(self2.status).toBe(400);
  });

  it("les mots de passe ne sont jamais renvoyés", async () => {
    const res = await t.http.get("/api/v1/admin/users").set(auth(admin.accessToken));
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("argon2");
  });

  it("les opérations sensibles sont journalisées dans l'audit", async () => {
    await t.http
      .patch(`/api/v1/admin/users/${user.id}`)
      .set(auth(admin.accessToken))
      .send({ status: "disabled" });
    const res = await t.http.get("/api/v1/admin/audit").set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    const actions = (res.body.items as { action: string }[]).map((i) => i.action);
    expect(actions).toContain("admin.user.update");
    expect(JSON.stringify(res.body)).not.toContain("motdepasse");
  });
});

describe("administration — cartes et tendances", () => {
  let t: TestApp;
  let admin: TestUser;

  beforeEach(async () => {
    t = makeApp();
    admin = await makeAdmin(t);
    await t.ctx.content.ensureDefaultCards();
  });

  it("crée, modifie puis masque une carte", async () => {
    const created = await t.http
      .put("/api/v1/admin/cards")
      .set(auth(admin.accessToken))
      .send({
        id: "nouvelle-carte",
        title: "Nouvelle carte",
        description: "Description de test",
        category: "Test",
        illustration: "sparkle",
        accent: "blue",
        order: 5,
        status: "coming_soon",
        featured: false,
        destination: "/features/nouvelle-carte",
      });
    expect(created.status).toBe(200);
    expect(created.body.id).toBe("nouvelle-carte");

    const updated = await t.http
      .put("/api/v1/admin/cards")
      .set(auth(admin.accessToken))
      .send({ ...created.body, status: "available", title: "Nouvelle carte activée" });
    expect(updated.body.status).toBe("available");

    const hidden = await t.http
      .put("/api/v1/admin/cards")
      .set(auth(admin.accessToken))
      .send({ ...updated.body, status: "hidden" });
    expect(hidden.body.status).toBe("hidden");

    // Côté client, la carte masquée disparaît.
    const clientCards = await t.http.get("/api/v1/cards").set(auth(admin.accessToken));
    const ids = (clientCards.body as { id: string }[]).map((c) => c.id);
    expect(ids).not.toContain("nouvelle-carte");
  });

  it("valide strictement les cartes (destination = route interne, pas d'URL arbitraire)", async () => {
    const res = await t.http
      .put("/api/v1/admin/cards")
      .set(auth(admin.accessToken))
      .send({
        id: "mauvaise",
        title: "X",
        description: "Description",
        category: "Test",
        illustration: "inconnue",
        accent: "blue",
        order: 1,
        status: "available",
        featured: false,
        destination: "javascript:alert(1)",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("réordonne les cartes", async () => {
    const res = await t.http
      .post("/api/v1/admin/cards/reorder")
      .set(auth(admin.accessToken))
      .send({ order: [{ id: "script-musique", order: 99 }] });
    expect(res.status).toBe(200);
    const cards = res.body as { id: string; order: number }[];
    const music = cards.find((c) => c.id === "script-musique");
    expect(music?.order).toBe(99);
  });

  it("configure les tendances : épingler, priorité, fenêtre, activation", async () => {
    const put = await t.http
      .put("/api/v1/admin/trending")
      .set(auth(admin.accessToken))
      .send({
        enabled: true,
        maxCards: 2,
        entries: [
          { cardId: "script-musique", pinned: true, priority: 90, startsAt: null, endsAt: null },
          { cardId: "sauvegarde-cloud", pinned: false, priority: 50, startsAt: null, endsAt: null },
        ],
      });
    expect(put.status).toBe(200);

    const resolved = await t.http.get("/api/v1/trending").set(auth(admin.accessToken));
    const ids = (resolved.body.cards as { id: string }[]).map((c) => c.id);
    expect(ids[0]).toBe("script-musique");
    expect(ids).toContain("sauvegarde-cloud");

    // Une entrée expirée est exclue.
    await t.http
      .put("/api/v1/admin/trending")
      .set(auth(admin.accessToken))
      .send({
        enabled: true,
        maxCards: 2,
        entries: [
          {
            cardId: "script-musique",
            pinned: true,
            priority: 90,
            startsAt: null,
            endsAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      });
    const after = await t.http.get("/api/v1/trending").set(auth(admin.accessToken));
    expect((after.body.cards as unknown[]).length).toBe(0);
  });

  it("désactive la section tendances", async () => {
    await t.http
      .put("/api/v1/admin/trending")
      .set(auth(admin.accessToken))
      .send({ enabled: false, maxCards: 3, entries: [{ cardId: "script-musique", pinned: true, priority: 1, startsAt: null, endsAt: null }] });
    const res = await t.http.get("/api/v1/trending").set(auth(admin.accessToken));
    expect(res.body.cards).toHaveLength(0);
  });
});

describe("administration — releases", () => {
  let t: TestApp;
  let admin: TestUser;

  beforeEach(async () => {
    t = makeApp();
    admin = await makeAdmin(t);
  });

  it("crée un brouillon, refuse les doublons publiés, publie sans GitHub", async () => {
    const draft = await t.http
      .post("/api/v1/admin/releases")
      .set(auth(admin.accessToken))
      .send({ version: "1.2.0", notes: "Nouveautés de la 1.2.0", assets: [] });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe("draft");

    // Sans GITHUB_TOKEN configuré, markPublished accepte (publication
    // effectuée par publier.bat via gh CLI) et marque published.
    const pub = await t.http
      .post("/api/v1/admin/releases/1.2.0/publish")
      .set(auth(admin.accessToken));
    expect(pub.status).toBe(200);
    expect(pub.body.status).toBe("published");

    // Un second brouillon sur la même version publiée est refusé.
    const dup = await t.http
      .post("/api/v1/admin/releases")
      .set(auth(admin.accessToken))
      .send({ version: "1.2.0", notes: "doublon", assets: [] });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("release_exists");
  });

  it("valide le format semver", async () => {
    const res = await t.http
      .post("/api/v1/admin/releases")
      .set(auth(admin.accessToken))
      .send({ version: "pas-une-version", notes: "x", assets: [] });
    expect(res.status).toBe(400);
  });

  it("la dernière release publiée est visible publiquement", async () => {
    await t.http
      .post("/api/v1/admin/releases")
      .set(auth(admin.accessToken))
      .send({ version: "0.9.0", notes: "beta", channel: "stable", assets: [] });
    await t.http.post("/api/v1/admin/releases/0.9.0/publish").set(auth(admin.accessToken));
    const latest = await t.http.get("/api/v1/releases/latest");
    expect(latest.status).toBe(200);
    expect(latest.body.version).toBe("0.9.0");
  });

  it("github-check renvoie un diagnostic clair sans configuration", async () => {
    const res = await t.http
      .get("/api/v1/admin/releases/9.9.9/github-check")
      .set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(false);
    expect(res.body.message).toMatch(/GITHUB_OWNER/);
  });
});

describe("administration — restauration des cartes par défaut", () => {
  it("restaure une carte manquante sans écraser les cartes existantes", async () => {
    const t = makeApp();
    const admin = await makeAdmin(t);
    await t.ctx.content.ensureDefaultCards();
    const before = await t.ctx.content.listCards(true);
    const music = before.find((c) => c.id === "script-musique")!;
    await t.ctx.content.upsertCard({ ...music, title: "Titre administré" });
    await t.ctx.content.deleteCard("bouclier-systeme");

    const res = await t.http
      .post("/api/v1/admin/cards/restore-defaults")
      .set(auth(admin.accessToken));
    expect(res.status).toBe(200);
    const after = res.body as { id: string; title: string }[];
    expect(after.some((c) => c.id === "bouclier-systeme")).toBe(true);
    // La carte administrée conserve son titre : pas d'écrasement.
    expect(after.find((c) => c.id === "script-musique")?.title).toBe("Titre administré");
  });

  it("refuse la restauration à un compte normal", async () => {
    const t = makeApp();
    const user = await registerUser(t, "simple@example.com");
    const res = await t.http
      .post("/api/v1/admin/cards/restore-defaults")
      .set(auth(user.accessToken));
    expect(res.status).toBe(403);
  });
});
