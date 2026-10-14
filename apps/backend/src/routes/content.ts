/**
 * Routes de contenu côté client LuxenX : tableau de bord, cartes,
 * tendances, paramètres, aide, releases publiques.
 */
import { Router } from "express";
import type { AppContext } from "../context.js";
import { asyncHandler, ApiError } from "../lib/errors.js";
import { authenticate } from "../middleware/auth.js";

export function contentRouter(ctx: AppContext): Router {
  const router = Router();

  /* Dashboard complet : un seul aller-retour pour l'écran d'accueil. */
  router.get(
    "/dashboard",
    authenticate(ctx.kv, ctx.cfg),
    asyncHandler(async (req, res) => {
      const [cards, trending, settings, help] = await Promise.all([
        ctx.content.listCards(false),
        ctx.content.resolveTrendingCards(),
        ctx.content.getSettings(),
        ctx.content.getHelp(),
      ]);

      if (settings.maintenanceMode && req.user?.role !== "admin") {
        throw new ApiError(
          503,
          "maintenance",
          settings.maintenanceMessage ?? "LuxenX est en maintenance. Réessayez plus tard.",
        );
      }

      res.json({
        user: req.user,
        cards,
        trending: { config: trending.config, cards: trending.cards },
        settings,
        help,
      });
    }),
  );

  router.get(
    "/cards",
    authenticate(ctx.kv, ctx.cfg),
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.listCards(false));
    }),
  );

  router.get(
    "/trending",
    authenticate(ctx.kv, ctx.cfg),
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.resolveTrendingCards());
    }),
  );

  router.get(
    "/settings",
    asyncHandler(async (_req, res) => {
      const s = await ctx.content.getSettings();
      // Ne pas exposer les annonces internes inactives.
      res.json({ ...s, announcements: s.announcements.filter((a) => a.active) });
    }),
  );

  router.get(
    "/help",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.content.getHelp());
    }),
  );

  /* Releases publiques (consultées par LuxenX pour l'information et le
     blocage éventuel des versions trop anciennes — la mise à jour
     binaire passe par GitHub Releases / electron-updater). */
  router.get(
    "/releases",
    asyncHandler(async (_req, res) => {
      const all = await ctx.releases.list();
      res.json(all.filter((r) => r.status === "published"));
    }),
  );

  router.get(
    "/releases/latest",
    asyncHandler(async (_req, res) => {
      res.json(await ctx.releases.latest());
    }),
  );

  return router;
}
