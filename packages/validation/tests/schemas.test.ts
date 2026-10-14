import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  cardUpsertSchema,
  trendingConfigSchema,
  releaseCreateSchema,
  paginationSchema,
  musicAnalyzeSchema,
} from "../src/index.js";

describe("schémas d'authentification", () => {
  it("accepte une inscription valide", () => {
    const r = registerSchema.safeParse({
      email: "a@b.co",
      username: "alice_42",
      password: "motdepasse-solide",
    });
    expect(r.success).toBe(true);
  });

  it("refuse un mot de passe court", () => {
    expect(registerSchema.safeParse({ email: "a@b.co", username: "alice", password: "court" }).success).toBe(false);
  });

  it("refuse un pseudo avec espaces", () => {
    expect(registerSchema.safeParse({ email: "a@b.co", username: "al ice", password: "motdepasse-solide" }).success).toBe(false);
  });

  it("refuse une adresse invalide", () => {
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "x" }).success).toBe(false);
  });
});

describe("schéma de carte (administration)", () => {
  const base = {
    id: "ma-carte",
    title: "Ma carte",
    description: "Une description suffisante.",
    category: "Test",
    illustration: "music",
    accent: "violet",
    order: 10,
    status: "coming_soon",
    featured: false,
    destination: "/features/ma-carte",
  };

  it("accepte une carte valide", () => {
    expect(cardUpsertSchema.safeParse(base).success).toBe(true);
  });

  it("refuse une destination de type javascript: (anti-exécution de code distant)", () => {
    expect(cardUpsertSchema.safeParse({ ...base, destination: "javascript:alert(1)" }).success).toBe(false);
  });

  it("refuse une illustration inconnue", () => {
    expect(cardUpsertSchema.safeParse({ ...base, illustration: "cube3d" }).success).toBe(false);
  });

  it("refuse un statut inconnu", () => {
    expect(cardUpsertSchema.safeParse({ ...base, status: "magic" }).success).toBe(false);
  });
});

describe("schéma des tendances", () => {
  it("accepte une configuration valide", () => {
    expect(
      trendingConfigSchema.safeParse({
        enabled: true,
        maxCards: 3,
        entries: [{ cardId: "aa", pinned: true, priority: 90, startsAt: null, endsAt: null }],
      }).success,
    ).toBe(true);
  });

  it("borne maxCards entre 1 et 12", () => {
    expect(trendingConfigSchema.safeParse({ enabled: true, maxCards: 99, entries: [] }).success).toBe(false);
  });
});

describe("schéma des releases", () => {
  it("accepte un semver valide", () => {
    expect(releaseCreateSchema.safeParse({ version: "1.2.0", notes: "notes", assets: [] }).success).toBe(true);
  });

  it("refuse un semver invalide", () => {
    expect(releaseCreateSchema.safeParse({ version: "v1.2", notes: "notes" }).success).toBe(false);
  });

  it("valide les empreintes sha256 des artefacts", () => {
    expect(
      releaseCreateSchema.safeParse({
        version: "1.0.0",
        notes: "n",
        assets: [{ name: "a.exe", size: 10, sha256: "zz" }],
      }).success,
    ).toBe(false);
  });
});

describe("pagination", () => {
  it("applique les valeurs par défaut", () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
  });

  it("coerce les chaînes numériques", () => {
    const r = paginationSchema.parse({ page: "3", pageSize: "50" });
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(50);
  });

  it("refuse une page hors bornes", () => {
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("analyse musique", () => {
  it("exige une URL http(s)", () => {
    expect(musicAnalyzeSchema.safeParse({ url: "ftp://x/y.mp3" }).success).toBe(false);
    expect(musicAnalyzeSchema.safeParse({ url: "https://x/y.mp3" }).success).toBe(true);
  });
});
