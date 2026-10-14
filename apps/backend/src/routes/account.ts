/**
 * Routes "mon compte" : profil, préférences, mot de passe, sessions,
 * suppression de compte. Toutes authentifiées.
 */
import { Router } from "express";
import { changePasswordSchema, deleteAccountSchema, updateAccountSchema } from "@luxenx/validation";
import type { AppContext } from "../context.js";
import { ApiError, asyncHandler, strParam } from "../lib/errors.js";
import { validateBody } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

export function accountRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx.kv, ctx.cfg));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const [preferences, sessions] = await Promise.all([
        ctx.users.getPreferences(user.id),
        ctx.users.listSessions(user.id, req.sessionId),
      ]);
      res.json({ user, preferences, sessions });
    }),
  );

  router.patch(
    "/",
    validateBody(updateAccountSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const body = req.body as { username?: string; preferences?: Record<string, unknown> };

      if (body.preferences) {
        await ctx.users.setPreferences(user.id, body.preferences);
      }
      const updated = body.username
        ? await ctx.users.update(user.id, { username: body.username })
        : user;
      res.json(updated);
    }),
  );

  router.post(
    "/password",
    validateBody(changePasswordSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const ok = await ctx.users.changePassword(user.id, currentPassword, newPassword);
      if (!ok) throw ApiError.badRequest("wrong_password", "Mot de passe actuel incorrect.");
      // Révoque les autres sessions (celle en cours reste valide).
      const sessions = await ctx.users.listSessions(user.id, req.sessionId);
      for (const s of sessions) {
        if (!s.current) await ctx.users.revokeSession(s.id);
      }
      logger.info("account", "mot de passe modifié", { userId: user.id });
      res.json({ message: "Mot de passe modifié. Les autres sessions ont été déconnectées." });
    }),
  );

  router.get(
    "/sessions",
    asyncHandler(async (req, res) => {
      const sessions = await ctx.users.listSessions(req.user!.id, req.sessionId);
      res.json(sessions);
    }),
  );

  router.delete(
    "/sessions/:id",
    asyncHandler(async (req, res) => {
      const id = strParam(req, "id");
      if (id === req.sessionId) {
        throw ApiError.badRequest("current_session", "Utilisez la déconnexion pour terminer la session active.");
      }
      await ctx.users.revokeSession(id);
      res.status(204).end();
    }),
  );

  router.delete(
    "/",
    validateBody(deleteAccountSchema),
    asyncHandler(async (req, res) => {
      const user = req.user!;
      const { password } = req.body as { password: string };
      const verified = await ctx.users.verifyCredentials(user.email, password);
      if (!verified) throw ApiError.badRequest("wrong_password", "Mot de passe incorrect : suppression refusée.");
      if (user.role === "admin") {
        throw new ApiError(
          403,
          "admin_deletion_forbidden",
          "Un compte administrateur ne peut pas être supprimé depuis l'application utilisateur.",
        );
      }
      await ctx.users.delete(user.id);
      logger.info("account", "compte supprimé à la demande de l'utilisateur", { userId: user.id });
      res.status(204).end();
    }),
  );

  return router;
}
