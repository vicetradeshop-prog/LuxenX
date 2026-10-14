/**
 * Validation systématique des entrées (body / query) avec Zod.
 * Toute requête non conforme reçoit une 400 explicite.
 */
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../lib/errors.js";

export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.slice(0, 8).map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(ApiError.badRequest("validation_error", "Données invalides.", details));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      const details = result.error.issues.slice(0, 8).map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(ApiError.badRequest("validation_error", "Paramètres de requête invalides.", details));
      return;
    }
    // Stocke les données validées dans res.locals pour le contrôleur.
    _res.locals.validatedQuery = result.data;
    next();
  };
}
