/**
 * Initialisation des données :
 * - contenu par défaut (cartes, tendances, paramètres, aide) si absent ;
 * - compte administrateur initial UNIQUEMENT via variables d'environnement
 *   ADMIN_EMAIL / ADMIN_PASSWORD (aucun mot de passe universel).
 *
 * Usage :
 *   npm run seed            (depuis apps/backend ou racine)
 *   --create-admin          force la tentative de création de l'admin
 */
import { loadConfig } from "./config.js";
import { createUpstashKv, MemoryKv, type KvStore } from "./lib/kv.js";
import { createContext, type AppContext } from "./context.js";
import { keys } from "./lib/keys.js";
import { logger } from "./lib/logger.js";

export async function seedDefaults(
  ctx: AppContext,
  opts: { createAdmin: boolean },
): Promise<{ adminCreated: boolean; contentSeeded: boolean }> {
  let contentSeeded = false;

  // Contenu par défaut si la base est vide.
  await ctx.content.ensureDefaultCards();
  const trending = await ctx.kv.get(keys.trending());
  if (!trending) {
    const { DEFAULT_TRENDING } = await import("./defaults.js");
    await ctx.content.putTrending(DEFAULT_TRENDING);
    contentSeeded = true;
  }
  const settings = await ctx.kv.get(keys.settings());
  if (!settings) {
    const { DEFAULT_SETTINGS } = await import("./defaults.js");
    await ctx.content.updateSettings(DEFAULT_SETTINGS);
    contentSeeded = true;
  }
  const help = await ctx.kv.get(keys.help());
  if (!help) {
    const { DEFAULT_HELP } = await import("./defaults.js");
    await ctx.content.putHelp(DEFAULT_HELP);
    contentSeeded = true;
  }

  // Compte administrateur initial.
  let adminCreated = false;
  if (opts.createAdmin && ctx.cfg.admin) {
    const existing = await ctx.kv.get(keys.userEmail(ctx.cfg.admin.email));
    if (existing) {
      logger.info("seed", "l'administrateur existe déjà, aucune création");
    } else {
      const user = await ctx.users.create({
        email: ctx.cfg.admin.email,
        username: ctx.cfg.admin.email.split("@")[0] ?? "admin",
        password: ctx.cfg.admin.password,
        role: "admin",
      });
      await ctx.users.update(user.id, { emailVerified: true });
      adminCreated = true;
      logger.info("seed", "compte administrateur initial créé", { email: ctx.cfg.admin.email });
      await ctx.audit.log({
        actorId: user.id,
        actorEmail: user.email,
        action: "seed.admin_created",
        target: user.id,
        details: "créé via npm run seed (variables ADMIN_EMAIL/ADMIN_PASSWORD)",
      });
    }
  }

  return { adminCreated, contentSeeded };
}

async function runStandalone(): Promise<void> {
  const cfg = loadConfig();
  let kv: KvStore;
  let kvKind: "upstash" | "memory";
  if (cfg.upstash) {
    kv = await createUpstashKv(cfg.upstash.url, cfg.upstash.token);
    kvKind = "upstash";
  } else {
    logger.error("seed", "UPSTASH_REDIS_REST_URL/TOKEN absents : seed impossible en mode autonome.");
    kv = new MemoryKv();
    kvKind = "memory";
  }
  const ctx = createContext(cfg, kv, kvKind);
  const result = await seedDefaults(ctx, { createAdmin: true });
  logger.info("seed", "terminé", result);
  if (!cfg.admin) {
    logger.warn("seed", "ADMIN_EMAIL/ADMIN_PASSWORD non définis : aucun administrateur créé.");
  }
}

// Exécuté directement via "npm run seed".
const isDirectRun = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isDirectRun) {
  runStandalone().catch((err) => {
    logger.error("seed", "échec", { err: String(err) });
    process.exit(1);
  });
}
