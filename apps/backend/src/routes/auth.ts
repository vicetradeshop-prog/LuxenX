/**
 * Routes d'authentification : inscription, connexion, rafraîchissement,
 * déconnexion, réinitialisation de mot de passe.
 *
 * Anti-énumération : les réponses ne révèlent pas si une adresse
 * électronique possède déjà un compte.
 */
import { Router } from "express";
import type { AuthResponse } from "@luxenx/shared";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "@luxenx/validation";
import type { AppContext } from "../context.js";
import { ApiError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../middleware/validate.js";
import { authRateLimit } from "../lib/ratelimit.js";
import { hashToken, generateResetToken, signAccessToken } from "../lib/tokens.js";
import { keys } from "../lib/keys.js";
import { logger } from "../lib/logger.js";
import { authenticate } from "../middleware/auth.js";

const RESET_TTL_SECONDS = 60 * 30;

export function authRouter(ctx: AppContext): Router {
  const router = Router();
  const { cfg, kv, users } = ctx;

  function requireSecret(): string {
    if (!cfg.sessionSecret) {
      throw new ApiError(503, "auth_unavailable", "Authentification indisponible : SESSION_SECRET non configuré côté serveur.");
    }
    return cfg.sessionSecret;
  }

  async function issueAuth(userId: string, role: "user" | "admin", userAgent: string): Promise<AuthResponse> {
    const secret = requireSecret();
    const { refreshToken, record } = await users.createSession(userId, cfg.refreshTokenTtl, userAgent);
    const accessToken = signAccessToken(
      { sub: userId, sid: record.sid, role },
      secret,
      cfg.accessTokenTtl,
    );
    const user = await users.findById(userId);
    if (!user) throw ApiError.internal("Compte créé mais introuvable.");
    return { accessToken, refreshToken, expiresIn: cfg.accessTokenTtl, user };
  }

  /* ---------------- Inscription ---------------- */

  router.post(
    "/register",
    authRateLimit(kv, "register", 6, 60 * 60),
    validateBody(registerSchema),
    asyncHandler(async (req, res) => {
      const { email, username, password } = req.body as {
        email: string;
        username: string;
        password: string;
      };

      requireSecret(); // échec explicite avant toute création de compte
      const settings = await ctx.content.getSettings();
      if (!settings.registrationsOpen) {
        throw new ApiError(403, "registrations_closed", "Les inscriptions sont temporairement fermées.");
      }

      if (await users.existsEmail(email)) {
        // Réponse volontairement générique (anti-énumération).
        logger.info("auth", "inscription refusée (adresse déjà utilisée)", { email });
        throw ApiError.badRequest(
          "registration_failed",
          "Inscription impossible avec ces informations. Vérifiez votre adresse électronique et votre mot de passe ; utilisez la réinitialisation de mot de passe si nécessaire.",
        );
      }

      const created = await users.create({ email, username, password });
      logger.info("auth", "nouveau compte créé", { userId: created.id });
      const auth = await issueAuth(created.id, created.role, String(req.headers["user-agent"] ?? ""));
      res.status(201).json(auth);
    }),
  );

  /* ---------------- Connexion ---------------- */

  router.post(
    "/login",
    authRateLimit(kv, "login", 8, 15 * 60),
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      requireSecret();
      const { email, password } = req.body as { email: string; password: string };
      const user = await users.verifyCredentials(email, password);

      if (!user) {
        throw ApiError.unauthorized("Identifiants incorrects.");
      }
      if (user.status === "disabled") {
        throw new ApiError(403, "account_disabled", "Ce compte a été désactivé. Contactez l'assistance LuxenX.");
      }

      await users.update(user.id, { lastLoginAt: new Date().toISOString() });
      const auth = await issueAuth(user.id, user.role, String(req.headers["user-agent"] ?? ""));
      res.json(auth);
    }),
  );

  /* ---------------- Rafraîchissement ---------------- */

  router.post(
    "/refresh",
    validateBody(refreshSchema),
    asyncHandler(async (req, res) => {
      const secret = requireSecret();
      const { refreshToken } = req.body as { refreshToken: string };
      const tokenHash = hashToken(refreshToken);

      // Retrouve la session via l'index inverse.
      const sid = await kv.get(`${keys.session(tokenHash)}:sid`);
      if (!sid) throw ApiError.unauthorized("Jeton de session invalide ou expiré.");
      const session = await users.getSession(sid);
      if (!session || session.tokenHash !== tokenHash) {
        throw ApiError.unauthorized("Jeton de session invalide ou expiré.");
      }

      const user = await users.findById(session.userId);
      if (!user) throw ApiError.unauthorized("Compte introuvable.");
      if (user.status === "disabled") {
        await users.revokeSession(sid);
        throw new ApiError(403, "account_disabled", "Ce compte a été désactivé.");
      }

      // Rotation : l'ancien refresh token est révoqué.
      await users.revokeSession(sid);
      const auth = await issueAuth(user.id, user.role, String(req.headers["user-agent"] ?? ""));
      void secret;
      res.json(auth);
    }),
  );

  /* ---------------- Déconnexion ---------------- */

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      const refreshToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
      if (typeof refreshToken === "string" && refreshToken.length >= 20) {
        const tokenHash = hashToken(refreshToken);
        const sid = await kv.get(`${keys.session(tokenHash)}:sid`);
        if (sid) await users.revokeSession(sid);
      }
      res.status(204).end();
    }),
  );

  /* ---------------- Mot de passe oublié ---------------- */

  router.post(
    "/forgot-password",
    authRateLimit(kv, "forgot", 5, 60 * 60),
    validateBody(forgotPasswordSchema),
    asyncHandler(async (req, res) => {
      const { email } = req.body as { email: string };
      const genericMessage =
        "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.";

      const raw = await kv.get(keys.userEmail(email));
      if (!raw) {
        res.json({ message: genericMessage });
        return;
      }

      const token = generateResetToken();
      const tokenHash = hashToken(token);
      await kv.set(
        keys.resetToken(tokenHash),
        JSON.stringify({ userId: raw, expiresAt: Date.now() + RESET_TTL_SECONDS * 1000 }),
        RESET_TTL_SECONDS,
      );

      if (cfg.smtpConfigured) {
        // Envoi réel à brancher selon le fournisseur SMTP choisi
        // (voir docs/SECURITY.md). Le jeton n'est jamais journalisé.
        logger.info("auth", "jeton de réinitialisation créé (SMTP configuré)", { userId: raw });
        res.json({ message: genericMessage });
        return;
      }

      if (!cfg.isProduction) {
        // Développement sans SMTP : le jeton est renvoyé pour permettre
        // de tester le parcours complet. Désactivé en production.
        logger.warn("auth", "mode développement : jeton de réinitialisation renvoyé dans la réponse");
        res.json({ message: genericMessage, devToken: token });
        return;
      }

      logger.warn("auth", "SMTP non configuré en production : réinitialisation indisponible");
      res.json({ message: genericMessage });
    }),
  );

  router.post(
    "/reset-password",
    authRateLimit(kv, "reset", 8, 60 * 60),
    validateBody(resetPasswordSchema),
    asyncHandler(async (req, res) => {
      const { token, password } = req.body as { token: string; password: string };
      const tokenHash = hashToken(token);
      const raw = await kv.get(keys.resetToken(tokenHash));
      if (!raw) throw ApiError.badRequest("invalid_token", "Lien de réinitialisation invalide ou expiré.");

      const parsed = JSON.parse(raw) as { userId: string; expiresAt: number };
      if (parsed.expiresAt < Date.now()) {
        await kv.del(keys.resetToken(tokenHash));
        throw ApiError.badRequest("invalid_token", "Lien de réinitialisation expiré.");
      }

      const ok = await users.setPassword(parsed.userId, password);
      if (!ok) throw ApiError.notFound("Compte introuvable.");
      await kv.del(keys.resetToken(tokenHash));
      // Révoque toutes les sessions existantes après changement de mot de passe.
      await users.revokeAllSessions(parsed.userId);
      logger.info("auth", "mot de passe réinitialisé", { userId: parsed.userId });
      res.json({ message: "Mot de passe réinitialisé. Vous pouvez vous reconnecter." });
    }),
  );

  /* ---------------- Profil courant ---------------- */

  router.get(
    "/me",
    authenticate(kv, cfg),
    asyncHandler(async (req, res) => {
      res.json(req.user ?? null);
    }),
  );

  return router;
}
