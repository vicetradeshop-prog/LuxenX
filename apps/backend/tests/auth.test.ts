import { describe, it, expect } from "vitest";
import { makeApp, registerUser, auth } from "./helpers.js";

describe("GET /api/v1/health", () => {
  it("répond ok avec le mode de stockage", async () => {
    const t = makeApp();
    const res = await t.http.get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.redis).toBe("ok");
    expect(res.body.storage).toBe("memory-volatile");
  });
});

describe("POST /api/v1/auth/register", () => {
  it("crée un compte réel et renvoie des jetons", async () => {
    const t = makeApp();
    const res = await t.http
      .post("/api/v1/auth/register")
      .send({ email: "alice@example.com", username: "alice", password: "super-secret-123" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user.role).toBe("user");
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    // Le haché ne sort jamais du serveur.
    expect(JSON.stringify(res.body)).not.toContain("argon2");
    expect(res.body.user.passwordHash).toBeUndefined();

    // Le compte est bien persisté.
    const stored = await t.ctx.users.findById(res.body.user.id);
    expect(stored?.email).toBe("alice@example.com");
  });

  it("refuse un mot de passe trop court (validation Zod)", async () => {
    const t = makeApp();
    const res = await t.http
      .post("/api/v1/auth/register")
      .send({ email: "bob@example.com", username: "bob", password: "court" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("refuse une adresse invalide", async () => {
    const t = makeApp();
    const res = await t.http
      .post("/api/v1/auth/register")
      .send({ email: "pas-une-adresse", username: "x_y", password: "super-secret-123" });
    expect(res.status).toBe(400);
  });

  it("ne révèle pas qu'une adresse existe déjà (anti-énumération)", async () => {
    const t = makeApp();
    await registerUser(t, "carol@example.com");
    const res = await t.http
      .post("/api/v1/auth/register")
      .send({ email: "carol@example.com", username: "carol2", password: "autre-secret-123" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("registration_failed");
    expect(res.body.error.message).not.toMatch(/existe|déjà/i);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("connecte un compte existant", async () => {
    const t = makeApp();
    await registerUser(t, "dave@example.com", "motdepasse-1234");
    const res = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "dave@example.com", password: "motdepasse-1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("dave@example.com");
  });

  it("refuse un mauvais mot de passe avec 401", async () => {
    const t = makeApp();
    await registerUser(t, "erin@example.com", "motdepasse-1234");
    const res = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "erin@example.com", password: "mauvais-motdepasse" });
    expect(res.status).toBe(401);
  });

  it("refuse un compte désactivé", async () => {
    const t = makeApp();
    const u = await registerUser(t, "frank@example.com");
    await t.ctx.users.update(u.id, { status: "disabled" });
    const res = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "frank@example.com", password: "motdepasse-solide-123" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("account_disabled");
  });

  it("limite les tentatives de connexion (rate limit)", async () => {
    const t = makeApp();
    await registerUser(t, "grace@example.com");
    let lastStatus = 0;
    for (let i = 0; i < 9; i++) {
      const res = await t.http
        .post("/api/v1/auth/login")
        .send({ email: "grace@example.com", password: "mauvais" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("sessions : refresh / logout / révocation", () => {
  it("rafraîchit avec rotation du refresh token", async () => {
    const t = makeApp();
    const u = await registerUser(t, "heidi@example.com");
    const res = await t.http.post("/api/v1/auth/refresh").send({ refreshToken: u.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(u.refreshToken);

    // L'ancien refresh token est révoqué.
    const replay = await t.http.post("/api/v1/auth/refresh").send({ refreshToken: u.refreshToken });
    expect(replay.status).toBe(401);

    // Le nouveau fonctionne.
    const again = await t.http.post("/api/v1/auth/refresh").send({ refreshToken: res.body.refreshToken });
    expect(again.status).toBe(200);
  });

  it("GET /me renvoie le profil avec un jeton valide", async () => {
    const t = makeApp();
    const u = await registerUser(t, "ivan@example.com");
    const res = await t.http.get("/api/v1/auth/me").set(auth(u.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ivan@example.com");
  });

  it("GET /me refuse un jeton falsifié", async () => {
    const t = makeApp();
    const u = await registerUser(t, "judy@example.com");
    const tampered = u.accessToken.slice(0, -4) + "AAAA";
    const res = await t.http.get("/api/v1/auth/me").set(auth(tampered));
    expect(res.status).toBe(401);
  });

  it("logout révoque la session", async () => {
    const t = makeApp();
    const u = await registerUser(t, "karl@example.com");
    const out = await t.http.post("/api/v1/auth/logout").send({ refreshToken: u.refreshToken });
    expect(out.status).toBe(204);
    const res = await t.http.post("/api/v1/auth/refresh").send({ refreshToken: u.refreshToken });
    expect(res.status).toBe(401);
  });
});

describe("réinitialisation de mot de passe", () => {
  it("parcours complet : forgot -> reset -> login (sessions révoquées)", async () => {
    const t = makeApp({ NODE_ENV: "development" });
    const u = await registerUser(t, "lena@example.com", "ancien-motdepasse-1");

    const forgot = await t.http.post("/api/v1/auth/forgot-password").send({ email: "lena@example.com" });
    expect(forgot.status).toBe(200);
    expect(typeof forgot.body.devToken).toBe("string");

    const reset = await t.http
      .post("/api/v1/auth/reset-password")
      .send({ token: forgot.body.devToken, password: "nouveau-motdepasse-1" });
    expect(reset.status).toBe(200);

    // Ancienne session révoquée.
    const me = await t.http.get("/api/v1/auth/me").set(auth(u.accessToken));
    expect([401, 403]).toContain(me.status);

    const login = await t.http
      .post("/api/v1/auth/login")
      .send({ email: "lena@example.com", password: "nouveau-motdepasse-1" });
    expect(login.status).toBe(200);
  });

  it("ne révèle pas si l'adresse est inconnue", async () => {
    const t = makeApp();
    const res = await t.http.post("/api/v1/auth/forgot-password").send({ email: "inconnu@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Si un compte existe/);
    expect(res.body.devToken).toBeUndefined();
  });

  it("refuse un jeton invalide", async () => {
    const t = makeApp();
    const res = await t.http
      .post("/api/v1/auth/reset-password")
      .send({ token: "x".repeat(40), password: "nouveau-motdepasse-1" });
    expect(res.status).toBe(400);
  });
});
