/**
 * Routes d'administration — protégées par authenticate + requireAdmin.
 * Chaque opération sensible est journalisée dans l'audit.
 * Le rôle est relu en base à chaque requête (jamais déclaré par le client).
 */
import { Router } from "express";
import {
  adminUpdateUserSchema,
  cardReorderSchema,
  cardUpsertSchema,
  helpContentSchema,
  paginationSchema,
  releaseCreateSchema,
  settingsUpdateSchema,
  trendingConfigSchema,
} from "@luxenx/validation";
import type { AppContext } from "../context.js";
import { ApiError, asyncHandler, strParam } from "../lib/errors.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { keys, dayKey } from "../lib/keys.js";
import { logger } from "../lib/logger.js";

export function adminRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx.kv, ctx.cfg), requireAdmin);

  const auditAction = (action: string, target: string | null, details?: string) =>
    ctx.audit.log({
      actorId: "inconnu",
      actorEmail: "inconnu",
      action,
      target,
      details: details ?? null,
    });

  // Remplace les placeholders d'acteur par l'admin courant.
  const log = (req: { user?: { id: string; email: string } }, action: string, target: string | null, details?: string) =>
    ctx.audit.log({
      actorId: req.user?.id ?? "inconnu",
      actorEmail: req.user?.email ?? "inconnu",
      action,
      target,
      details: details ?? null,
    });

  void auditAction;

  /* ---------------- Statistiques ---------------- */

  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const counts = await ctx.users.countByStatus();
      const cards = await ctx.content.listCards(true);
      const latest = await ctx.releases.latest();
      const today = Number((await ctx.kv.get(keys.signupsDay(dayKey()))) ?? 0);

      let week = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000);
        week += Number((await ctx.kv.get(keys.signupsDay(dayKey(d)))) ?? 0);
      }

      const { items: recentAudit } = await ctx.audit.list(1, 10);

      res.json({
        totalUsers: counts.total,
        newUsersToday: today,
        newUsersWeek: week,
        activeUsers: counts.active,
        disabledUsers: counts.disabled,
        totalCards: cards.length,
        availableCards: cards.filter((c) => c.status === "available").length,
        latestRelease: latest,
        backendVersion: process.env.npm_package_version ?? "0.1.0",
        redisOk: ctx.kvKind === "memory" ? true : await pingRedis(ctx),
        recentAudit,
      });
    }),
  );

  /* ---------------- Utilisateurs ---------------- */

  router.get(
    "/users",
    validateQuery(paginationSchema),
    asyncHandler(async (req, res) => {
      const q = res.locals.validatedQuery as {
        page: number;
        pageSize: number;
        search?: string;
        status?: "active" | "disabled" | "pending_verification";
        role?: "user" | "admin";
      };
      const result = await ctx.users.list(q);
      res.json({ items: result.items, page: q.page, pageSize: q.pageSize, total: result.total });
    }),
  );

  router.get(
    "/users/:id",
    asyncHandler(async (req, res) => {
      const user = await ctx.users.findById(strParam(req, "id"));
      if (!user) throw ApiError.notFound("Compte introuvable.");
      const sessions = await ctx.users.listSessions(user.id);
      res.json({ user, sessions });
    }),
  );

  router.patch(
    "/users/:id",
    validateBody(adminUpdateUserSchema),
    asyncHandler(async (req, res) => {
      const id = strParam(req, "id");
      const target = await ctx.users.findById(id);
      if (!target) throw ApiError.notFound("Compte introuvable.");
      const body = req.body as { status?: string; role?: string; emailVerified?: boolean };

      // Garde-fous : un admin ne se désactive pas / ne se rétrograde pas lui-même.
      if (target.id === req.user!.id && (body.status === "disabled" || body.role === "user")) {
        throw ApiError.badRequest("self_demotion", "Impossible de vous désactiver ou de vous rétrograder vous-même.");
      }

      const updated = await ctx.users.update(id, body as never);
      if (body.status === "disabled") await ctx.users.revokeAllSessions(id);
      await log(req, "admin.user.update", id, JSON.stringify(body));
      logger.info("admin", "compte modifié", { actor: req.user!.id, target: id, patch: body });
      res.json(updated);
    }),
  );

  router.delete(
    "/users/:id",
    asyncHandler(async (req, res) => {
      const id = strParam(req, "id");
      if (id === req.user!.id) throw ApiError.badRequest("self_delete", "Impossible de supprimer votre propre compte ici.");
      const target = await ctx.users.findById(id);
      if (!target) throw ApiError.notFound("Compte introuvable.");
      await ctx.users.delete(id);
      await log(req, "admin.user.delete", id, target.email);
      res.status(204).end();
    }),
  );

  router.delete(
    "/users/:id/sessions",
    asyncHandler(async (req, res) => {
      const revoked = await ctx.users.revokeAllSessions(strParam(req, "id"));
      await log(req, "admin.user.revoke_sessions", strParam(req, "id"), `${revoked} session(s)`);
      res.json({ revoked });
    }),
  );

  /* ---------------- Cartes ---------------- */

  router.get(
    "/cards",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.listCards(true));
    }),
  );

  router.put(
    "/cards",
    validateBody(cardUpsertSchema),
    asyncHandler(async (req, res) => {
      const card = await ctx.content.upsertCard(req.body as never);
      await log(req, "admin.card.upsert", card.id, `${card.title} [${card.status}]`);
      res.json(card);
    }),
  );

  router.post(
    "/cards/reorder",
    validateBody(cardReorderSchema),
    asyncHandler(async (req, res) => {
      const body = req.body as { order: { id: string; order: number }[] };
      const cards = await ctx.content.reorderCards(body.order);
      await log(req, "admin.card.reorder", null, `${body.order.length} carte(s)`);
      res.json(cards);
    }),
  );

  router.post(
    "/cards/restore-defaults",
    asyncHandler(async (req, res) => {
      const before = (await ctx.content.listCards(true)).length;
      await ctx.content.ensureDefaultCards();
      const cards = await ctx.content.listCards(true);
      await log(req, "admin.cards.restore_defaults", null, `${cards.length - before} carte(s) restauree(s)`);
      res.json(cards);
    }),
  );

  router.delete(
    "/cards/:id",
    asyncHandler(async (req, res) => {
      await ctx.content.deleteCard(strParam(req, "id"));
      await log(req, "admin.card.delete", strParam(req, "id"));
      res.status(204).end();
    }),
  );

  /* ---------------- Tendances ---------------- */

  router.get(
    "/trending",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.getTrending());
    }),
  );

  router.put(
    "/trending",
    validateBody(trendingConfigSchema),
    asyncHandler(async (req, res) => {
      const config = await ctx.content.putTrending(req.body as never);
      await log(req, "admin.trending.update", null, `${config.entries.length} entrée(s), enabled=${config.enabled}`);
      res.json(config);
    }),
  );

  /* ---------------- Paramètres globaux ---------------- */

  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.getSettings());
    }),
  );

  router.put(
    "/settings",
    validateBody(settingsUpdateSchema),
    asyncHandler(async (req, res) => {
      const settings = await ctx.content.updateSettings(req.body as never);
      await log(req, "admin.settings.update", null, JSON.stringify(req.body).slice(0, 300));
      res.json(settings);
    }),
  );

  /* ---------------- Aide (FAQ / guides) ---------------- */

  router.get(
    "/help",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.getHelp());
    }),
  );

  router.put(
    "/help",
    validateBody(helpContentSchema),
    asyncHandler(async (req, res) => {
      const help = await ctx.content.putHelp(req.body as never);
      await log(req, "admin.help.update", null, `${help.faq.length} FAQ, ${help.guides.length} guides`);
      res.json(help);
    }),
  );

  /* ---------------- Releases ---------------- */

  router.get(
    "/releases",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.releases.list());
    }),
  );

  router.post(
    "/releases",
    validateBody(releaseCreateSchema),
    asyncHandler(async (req, res) => {
      const release = await ctx.releases.createDraft(req.body as never);
      await log(req, "admin.release.draft", release.version, release.channel);
      res.status(201).json(release);
    }),
  );

  router.post(
    "/releases/:version/publish",
    asyncHandler(async (req, res) => {
      const release = await ctx.releases.markPublished(strParam(req, "version"));
      await log(req, "admin.release.publish", release.version, release.githubReleaseUrl ?? "sans URL GitHub");
      res.json(release);
    }),
  );

  router.get(
    "/releases/:version/github-check",
    asyncHandler(async (req, res) => {
      res.json(await ctx.releases.checkGithubRelease(strParam(req, "version")));
    }),
  );

  router.delete(
    "/releases/:version",
    asyncHandler(async (req, res) => {
      await ctx.releases.delete(strParam(req, "version"));
      await log(req, "admin.release.delete", strParam(req, "version"));
      res.status(204).end();
    }),
  );

  /* ---------------- Audit ---------------- */

  router.get(
    "/audit",
    validateQuery(paginationSchema),
    asyncHandler(async (_req, res) => {
      const q = res.locals.validatedQuery as { page: number; pageSize: number };
      const { items, total } = await ctx.audit.list(q.page, q.pageSize);
      res.json({ items, page: q.page, pageSize: q.pageSize, total });
    }),
  );

  return router;
}

async function pingRedis(ctx: AppContext): Promise<boolean> {
  try {
    await ctx.kv.set("lux:health:ping", "1", 60);
    return true;
  } catch {
    return false;
  }
}
