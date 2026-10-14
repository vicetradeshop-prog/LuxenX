/**
 * Limitation de débit basée sur Redis (compteurs avec TTL).
 * Protège l'authentification et les routes sensibles contre les abus.
 */
import type { NextFunction, Request, Response } from "express";
import type { KvStore } from "./kv.js";
import { keys } from "./keys.js";
import { ApiError } from "./errors.js";

export interface RateLimitOptions {
  /** Nom du compartiment (ex. "login"). */
  name: string;
  /** Nombre maximal de requêtes dans la fenêtre. */
  max: number;
  /** Fenêtre en secondes. */
  windowSeconds: number;
  message?: string;
}

export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "inconnu";
}

export function rateLimit(kv: KvStore, opts: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const bucket = `${opts.name}:${clientIp(req)}`;
      const key = keys.rate(bucket);
      const count = await kv.incr(key);
      if (count === 1) await kv.expire(key, opts.windowSeconds);
      if (count > opts.max) {
        throw ApiError.tooMany(
          opts.message ?? `Trop de requêtes. Nouvelle tentative possible dans ${opts.windowSeconds} s.`,
        );
      }
      next();
    } catch (err) {
      if (err instanceof ApiError) return next(err);
      // Si Redis échoue, on refuse (fail-closed) uniquement sur les routes
      // critiques ; ici on laisse passer pour ne pas bloquer indéfiniment
      // les utilisateurs en cas d'incident d'infrastructure, mais on journalise.
      console.warn("[ratelimit] dégradation : limite non appliquée", err);
      next();
    }
  };
}

/** Limiteur renforcé pour l'authentification (par IP + email). */
export function authRateLimit(kv: KvStore, name: string, max: number, windowSeconds: number) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const email =
        typeof (req.body as { email?: unknown } | undefined)?.email === "string"
          ? ((req.body as { email: string }).email.toLowerCase().slice(0, 254))
          : "sans-email";
      const bucket = `${name}:${clientIp(req)}:${email}`;
      const key = keys.rate(bucket);
      const count = await kv.incr(key);
      if (count === 1) await kv.expire(key, windowSeconds);
      if (count > max) {
        throw ApiError.tooMany(
          "Trop de tentatives d'authentification. Attendez quelques minutes avant de réessayer.",
        );
      }
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : undefined);
    }
  };
}
