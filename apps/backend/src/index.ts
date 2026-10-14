/**
 * Point d'entrée du backend LuxenX.
 * - Charge la configuration
 * - Initialise Upstash Redis (ou mémoire volatile en développement)
 * - Seed automatique du contenu par défaut au premier démarrage
 * - Démarre le serveur HTTP
 */
import { loadConfig, assertConfigUsable } from "./config.js";
import { createUpstashKv, MemoryKv, type KvStore } from "./lib/kv.js";
import { createContext } from "./context.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { seedDefaults } from "./seed.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const warnings = assertConfigUsable(cfg);
  for (const w of warnings) logger.warn("config", w);

  let kv: KvStore;
  let kvKind: "upstash" | "memory";
  if (cfg.upstash) {
    kv = await createUpstashKv(cfg.upstash.url, cfg.upstash.token);
    kvKind = "upstash";
    logger.info("kv", "Upstash Redis connecté (REST)");
  } else {
    kv = new MemoryKv();
    kvKind = "memory";
    logger.warn("kv", "Stockage mémoire VOLATILE — les données seront perdues au redémarrage.");
  }

  const ctx = createContext(cfg, kv, kvKind);
  await seedDefaults(ctx, { createAdmin: false });

  const app = createApp(ctx);
  const server = app.listen(cfg.port, () => {
    logger.info("server", `Backend LuxenX démarré sur http://localhost:${cfg.port} (${cfg.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    logger.info("server", `signal ${signal} : arrêt en cours…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("server", "échec du démarrage", { err: String(err) });
  process.exit(1);
});
