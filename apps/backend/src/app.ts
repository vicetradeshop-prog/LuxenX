/**
 * Assemblage de l'application Express.
 * Sécurité : CORS restreint, en-têtes stricts, limite de taille du corps,
 * rate limiting global, gestion centralisée des erreurs.
 */
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { AppContext } from "./context.js";
import { errorHandler, notFoundHandler, ApiError } from "./lib/errors.js";
import { rateLimit, clientIp } from "./lib/ratelimit.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { contentRouter } from "./routes/content.js";
import { adminRouter } from "./routes/admin.js";

export function createApp(ctx: AppContext): Express {
  const app = express();
  const { cfg } = ctx;

  app.disable("x-powered-by");
  app.set("trust proxy", true); // derrière Render/proxy : IP réelle via x-forwarded-for

  /* --- En-têtes de sécurité --- */
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (cfg.isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  /* --- CORS : origines explicitement autorisées + clients Electron ---
     Les applications de bureau n'ont pas d'Origin fiable ; on autorise
     l'absence d'Origin (clients natifs) et les origines configurées.    */
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = cfg.corsOrigins;
    // En développement, les renderers Electron/Vite (localhost:5173/5174)
    // sont des origines croisées légitimes : on les autorise explicitement.
    // Jamais en production, où seules les origines configurées comptent.
    const isLocalDevOrigin =
      !cfg.isProduction &&
      typeof origin === "string" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (
      !origin ||
      allowed.includes(origin) ||
      origin.startsWith("file://") ||
      origin === "null" ||
      isLocalDevOrigin
    ) {
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  /* --- Corps de requête borné --- */
  app.use(express.json({ limit: "256kb" }));

  /* --- Journalisation d'accès minimaliste (expurgée) --- */
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 500) {
        logger.error("http", `${req.method} ${req.route?.path ?? req.path} -> ${res.statusCode}`, {
          ip: clientIp(req),
        });
      }
    });
    next();
  });

  /* --- Rate limiting global (par IP) --- */
  app.use("/api", rateLimit(ctx.kv, { name: "global", max: 300, windowSeconds: 60 }));

  /* --- Routes versionnées --- */
  app.use("/api/v1/health", healthRouter(ctx));
  app.use("/api/v1/auth", authRouter(ctx));
  app.use("/api/v1/account", accountRouter(ctx));
  app.use("/api/v1", contentRouter(ctx)); // dashboard, cards, trending, settings, help, releases
  app.use("/api/v1/admin", adminRouter(ctx));

  app.get("/", (_req, res) => {
    res.json({
      name: "LuxenX Backend",
      version: process.env.npm_package_version ?? "0.1.0",
      docs: "Voir docs/ARCHITECTURE.md",
      health: "/api/v1/health",
    });
  });

  /* --- 404 + erreurs --- */
  app.use(notFoundHandler);
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ApiError && err.status === 429) {
      logger.warn("ratelimit", "requête limitée", { ip: clientIp(req), path: req.path });
    }
    errorHandler(err, req, res, next);
  });

  return app;
}
