import { Router } from "express";
import type { AppContext } from "../context.js";
import { asyncHandler } from "../lib/errors.js";

export function healthRouter(ctx: AppContext): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      let redis: "ok" | "unavailable" | "not_configured" = "not_configured";
      if (ctx.kvKind === "upstash") {
        try {
          await ctx.kv.set("lux:health:ping", "1", 60);
          redis = "ok";
        } catch {
          redis = "unavailable";
        }
      } else {
        redis = "ok"; // mémoire volatile (développement)
      }
      res.status(redis === "unavailable" ? 503 : 200).json({
        status: redis === "unavailable" ? "degraded" : "ok",
        redis,
        storage: ctx.kvKind === "upstash" ? "upstash" : "memory-volatile",
        version: process.env.npm_package_version ?? "0.1.0",
        time: new Date().toISOString(),
      });
    }),
  );

  return router;
}
