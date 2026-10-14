/**
 * Erreurs applicatives + gestion centralisée.
 * Toutes les réponses d'erreur suivent la forme ApiErrorBody :
 * { error: { code, message, details? } }
 */
import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@luxenx/shared";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = "Authentification requise."): ApiError {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "Accès refusé : privilèges administrateur requis."): ApiError {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "Ressource introuvable."): ApiError {
    return new ApiError(404, "not_found", message);
  }
  static conflict(code: string, message: string): ApiError {
    return new ApiError(409, code, message);
  }
  static tooMany(message = "Trop de tentatives. Réessayez plus tard."): ApiError {
    return new ApiError(429, "rate_limited", message);
  }
  static internal(message = "Erreur interne du serveur."): ApiError {
    return new ApiError(500, "internal_error", message);
  }
  static upstream(message = "Service externe indisponible."): ApiError {
    return new ApiError(502, "upstream_error", message);
  }
}

export function toErrorBody(err: ApiError): ApiErrorBody {
  return { error: { code: err.code, message: err.message, details: err.details } };
}

/** Enveloppe async pour propager les erreurs vers le middleware central. */
export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json(toErrorBody(err));
    return;
  }

  // Body JSON invalide (express)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json(toErrorBody(ApiError.badRequest("invalid_json", "Corps de requête JSON invalide.")));
    return;
  }

  //Erreur inattendue : journalisée côté serveur, message générique côté client.
  console.error(`[backend] erreur non gérée sur ${req.method} ${req.path}:`, err);
  res.status(500).json(toErrorBody(ApiError.internal()));
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(toErrorBody(ApiError.notFound(`Route inconnue : ${req.method} ${req.path}`)));
}

/**
 * Express 5 type les paramètres de route comme string | string[] | undefined.
 * Cet utilitaire renvoie une chaîne propre ou lève une 404.
 */
export function strParam(req: { params: Record<string, unknown> }, name: string): string {
  const v = req.params[name];
  if (typeof v !== "string" || v.length === 0) throw ApiError.notFound(`Paramètre « ${name} » manquant.`);
  return v;
}
