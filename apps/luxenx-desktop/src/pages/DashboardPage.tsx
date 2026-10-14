/**
 * Accueil : salutation, tendances mises en avant, grille des cartes,
 * état de synchronisation. Aucune section vide présentée comme finie.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, RefreshCw, WifiOff } from "lucide-react";
import type { FeatureCard } from "@luxenx/shared";
import { EmptyBoxIllustration, LxButton, LxEmptyState, LxSpinner, LxSectionHeader, Illustration, LxBadge } from "@luxenx/ui";
import { useApp } from "../state/AppState.js";
import { navigate } from "../lib/nav.js";
import { FeatureCardView } from "../components/FeatureCardView.js";
import { LockedCardModal } from "../components/LockedCardModal.js";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function DashboardPage() {
  const { data, user, refreshData } = useApp();
  const [lockedCard, setLockedCard] = useState<FeatureCard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const trendingIds = useMemo(
    () => new Set(data.trending.cards.map((c) => c.id)),
    [data.trending.cards],
  );
  const heroCard = data.trending.cards[0] ?? null;
  const otherTrending = data.trending.cards.slice(1);
  const rest = data.cards.filter((c) => !trendingIds.has(c.id));

  function openCard(card: FeatureCard) {
    if (card.status === "available") {
      if (card.id === "script-musique" || card.destination.includes("script-musique")) {
        navigate({ name: "music" });
      } else {
        navigate({ name: "features" });
      }
    } else {
      setLockedCard(card);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }

  const loading = data.fetchedAt === null && !data.error;

  return (
    <div className="lx-page">
      {/* ---- Salutation ---- */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 26 }}>
          <div>
            <h1 className="lx-title-xl">
              {greeting()}, <span className="lx-gradient-text">{user?.username}</span>
            </h1>
            <p className="lx-subtitle">Que voulez-vous explorer aujourd'hui ?</p>
          </div>
          <LxButton variant="secondary" size="sm" onClick={() => void onRefresh()} loading={refreshing} icon={<RefreshCw size={14} />}>
            Actualiser
          </LxButton>
        </div>
      </motion.div>

      {data.error && (
        <div className="lx-update-banner" style={{ borderColor: "rgba(251,191,36,0.35)" }}>
          <WifiOff size={18} style={{ color: "var(--lx-warning)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Synchronisation impossible</div>
            <div className="lx-small lx-muted">{data.error}</div>
          </div>
          <LxButton size="sm" variant="ghost" onClick={() => void onRefresh()}>
            Réessayer
          </LxButton>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <LxSpinner size={28} />
        </div>
      )}

      {!loading && data.cards.length === 0 && !data.error && (
        <LxEmptyState
          illustration={<EmptyBoxIllustration />}
          title="Aucune fonctionnalité publiée"
          description="L'administrateur n'a pas encore publié de cartes. Revenez bientôt !"
        />
      )}

      {/* ---- Carte tendance héro ---- */}
      {heroCard && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 34 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Flame size={17} style={{ color: "var(--lx-pink)" }} />
            <span className="lx-title-md" style={{ fontSize: 16 }}>En tendance</span>
            <LxBadge tone="pink">{data.trending.cards.length}</LxBadge>
          </div>

          <div className="lx-trending-hero" role="button" tabIndex={0} onClick={() => openCard(heroCard)} onKeyDown={(e) => e.key === "Enter" && openCard(heroCard)}>
            <div className="lx-trending-shine" aria-hidden />
            <div className="lx-trending-hero-illustration">
              <Illustration id={heroCard.illustration} size={112} />
            </div>
            <div style={{ position: "relative", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <LxBadge tone="violet" glow>MIS EN AVANT</LxBadge>
                {heroCard.status !== "available" && <LxBadge tone="neutral">{heroCard.badge ?? "BIENTÔT"}</LxBadge>}
              </div>
              <h2 className="lx-title-lg" style={{ fontSize: 28 }}>{heroCard.title}</h2>
              <p className="lx-subtitle" style={{ maxWidth: 520, fontSize: 14.5 }}>{heroCard.description}</p>
              <div style={{ marginTop: 16 }}>
                <LxButton size="sm" variant={heroCard.status === "available" ? "primary" : "secondary"}>
                  {heroCard.status === "available" ? "Ouvrir" : "En savoir plus"}
                </LxButton>
              </div>
            </div>
          </div>

          {otherTrending.length > 0 && (
            <div className="lx-card-grid" style={{ marginTop: 20 }}>
              {otherTrending.map((c) => (
                <FeatureCardView key={c.id} card={c} trending onOpen={openCard} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ---- Toutes les fonctionnalités ---- */}
      {rest.length > 0 && (
        <section>
          <LxSectionHeader
            title="Fonctionnalités"
            subtitle="Toutes les solutions LuxenX, disponibles ou à venir."
            action={
              <LxButton variant="ghost" size="sm" onClick={() => navigate({ name: "features" })}>
                Tout voir →
              </LxButton>
            }
          />
          <div className="lx-card-grid">
            {rest.slice(0, 6).map((c) => (
              <FeatureCardView key={c.id} card={c} onOpen={openCard} />
            ))}
          </div>
        </section>
      )}

      <LockedCardModal card={lockedCard} open={lockedCard !== null} onClose={() => setLockedCard(null)} />
    </div>
  );
}
