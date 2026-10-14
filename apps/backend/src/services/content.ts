/**
 * Service de contenu : cartes de fonctionnalités, tendances, paramètres
 * globaux et aide. Données purement déclaratives, validées par Zod avant
 * écriture — jamais de code exécutable distribué aux clients.
 */
import type { FeatureCard, GlobalSettings, HelpContent, TrendingConfig, TrendingEntry } from "@luxenx/shared";
import type { KvStore } from "../lib/kv.js";
import { keys } from "../lib/keys.js";
import { DEFAULT_CARDS, DEFAULT_HELP, DEFAULT_SETTINGS, DEFAULT_TRENDING } from "../defaults.js";

export function contentService(kv: KvStore) {
  /* ---------------- Cartes ---------------- */

  async function listCards(includeHidden = false): Promise<FeatureCard[]> {
    const ids = await kv.smembers(keys.cardsIndex());
    const cards: FeatureCard[] = [];
    for (const id of ids) {
      const raw = await kv.get(keys.card(id));
      if (raw) cards.push(JSON.parse(raw) as FeatureCard);
    }
    cards.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    return includeHidden ? cards : cards.filter((c) => c.status !== "hidden");
  }

  return {
    listCards,

    async getCard(id: string): Promise<FeatureCard | null> {
      const raw = await kv.get(keys.card(id));
      return raw ? (JSON.parse(raw) as FeatureCard) : null;
    },

    async upsertCard(input: Omit<FeatureCard, "updatedAt"> & { updatedAt?: string }): Promise<FeatureCard> {
      const existing = await this.getCard(input.id);
      const card: FeatureCard = {
        ...input,
        publishedAt: input.publishedAt ?? existing?.publishedAt ?? null,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(keys.card(card.id), JSON.stringify(card));
      await kv.sadd(keys.cardsIndex(), card.id);
      return card;
    },

    async deleteCard(id: string): Promise<void> {
      await kv.del(keys.card(id));
      await kv.srem(keys.cardsIndex(), id);
      // Retire aussi la carte des tendances.
      const trending = await this.getTrending();
      const entries = trending.entries.filter((e) => e.cardId !== id);
      await this.putTrending({ ...trending, entries });
    },

    async reorderCards(order: { id: string; order: number }[]): Promise<FeatureCard[]> {
      for (const item of order) {
        const card = await this.getCard(item.id);
        if (card) await this.upsertCard({ ...card, order: item.order });
      }
      return listCards(true);
    },

    /**
     * Seed : crée les cartes par défaut MANQUANTES sans jamais écraser
     * une carte déjà administrée (les modifications Admin sont sacrées).
     */
    async ensureDefaultCards(): Promise<void> {
      for (const card of DEFAULT_CARDS) {
        const existing = await this.getCard(card.id);
        if (!existing) await this.upsertCard(card);
      }
    },

    /* ---------------- Tendances ---------------- */

    async getTrending(): Promise<TrendingConfig> {
      const raw = await kv.get(keys.trending());
      return raw ? (JSON.parse(raw) as TrendingConfig) : { ...DEFAULT_TRENDING };
    },

    async putTrending(config: TrendingConfig): Promise<TrendingConfig> {
      const next: TrendingConfig = { ...config, updatedAt: new Date().toISOString() };
      await kv.set(keys.trending(), JSON.stringify(next));
      return next;
    },

    /** Tendances effectives : entrées valides, dans la fenêtre, triées. */
 async resolveTrendingCards(): Promise<{ config: TrendingConfig; cards: FeatureCard[] }> {
      const config = await this.getTrending();
      const allCards = await listCards(false);
      const byId = new Map(allCards.map((c) => [c.id, c]));
      const nowIso = new Date().toISOString();

      let entries: TrendingEntry[] = [];
      if (config.enabled) {
        entries = config.entries
          .filter((e) => byId.has(e.cardId))
          .filter((e) => !e.startsAt || e.startsAt <= nowIso)
          .filter((e) => !e.endsAt || e.endsAt >= nowIso)
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.priority - a.priority)
          .slice(0, config.maxCards);
      }
      return { config, cards: entries.map((e) => byId.get(e.cardId)!).filter((c) => c.status === "available" || c.status === "coming_soon") };
    },

    /* ---------------- Paramètres globaux ---------------- */

    async getSettings(): Promise<GlobalSettings> {
      const raw = await kv.get(keys.settings());
      return raw ? (JSON.parse(raw) as GlobalSettings) : { ...DEFAULT_SETTINGS };
    },

    async updateSettings(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
      const current = await this.getSettings();
      const next: GlobalSettings = { ...current, ...patch, updatedAt: new Date().toISOString() };
      await kv.set(keys.settings(), JSON.stringify(next));
      return next;
    },

    /* ---------------- Aide (FAQ + guides) ---------------- */

    async getHelp(): Promise<HelpContent> {
      const raw = await kv.get(keys.help());
      return raw ? (JSON.parse(raw) as HelpContent) : { ...DEFAULT_HELP };
    },

    async putHelp(help: HelpContent): Promise<HelpContent> {
      const next: HelpContent = { ...help, updatedAt: new Date().toISOString() };
      await kv.set(keys.help(), JSON.stringify(next));
      return next;
    },
  };
}

export type ContentService = ReturnType<typeof contentService>;
