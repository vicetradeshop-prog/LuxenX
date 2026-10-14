/**
 * Middlewares d'authentification et d'autorisation.
 * Les permissions sont TOUJOURS vérifiées côté serveur à partir des
 * données stockées (rôle en base), jamais à partir d'une déclaration
 * du client.
 */
import type { NextFunction, Request, Response } from "express";
import type { KvStore } from "../lib/kv.js";
import type { BackendConfig } from "../config.js";
import { ApiError, asyncHandler } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";
import { keys } from "../lib/keys.js";
import type { UserRecord } from "@luxenx/shared";
import { usersService } from "../services/users.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRecord;
      sessionId?: string;
    }
  }
}

export function authenticate(kv: KvStore, cfg: BackendConfig) {
  return asyncHandler<Request>(async (req, _res, next) => {
    if (!cfg.sessionSecret) {
      throw new ApiError(503, "auth_unavailable", "Authentification indisponible : SESSION_SECRET non configuré.");
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();
    const token = header.slice(7);
    const payload = verifyAccessToken(token, cfg.sessionSecret);
    if (!payload) throw ApiError.unauthorized("Session expirée ou invalide. Reconnectez-vous.");

    // Vérifie que la session existe toujours (révocation) et que le
    // compte est actif — lecture en base à chaque requête authentifiée.
    const sessionRaw = await kv.get(keys.session(payload.sid));
    if (!sessionRaw) throw ApiError.unauthorized("Session révoquée ou expirée. Reconnectez-vous.");

    const user = await usersService(kv).findById(payload.sub);
    if (!user) throw ApiError.unauthorized("Compte introuvable.");
    if (user.status === "disabled") {
      throw new ApiError(403, "account_disabled", "Ce compte a été désactivé. Contactez l'assistance LuxenX.");
    }

    req.user = user;
    req.sessionId = payload.sid;
    next();
  });
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== "admin") return next(ApiError.forbidden());
  next();
}
