/**
 * Tendances : cartes mises en avant par l'administrateur.
 * Synchronisées au démarrage, toutes les 5 minutes et à la reconnexion.
 */
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { FeatureCard } from "@luxenx/shared";
import { LxEmptyState, LxSectionHeader, Illustration, LxBadge, LxButton, EmptyBoxIllustration } from "@luxenx/ui";
import { useState } from "react";
import { useApp } from "../state/AppState.js";
import { navigate } from "../lib/nav.js";
import { LockedCardModal } from "../components/LockedCardModal.js";
import { FeatureCardView } from "../components/FeatureCardView.js";

export function TrendingPage() {
  const { data } = useApp();
  const [lockedCard, setLockedCard] = useState<FeatureCard | null>(null);
  const trending = data.trending.cards;

  function openCard(card: FeatureCard) {
    if (card.status === "available" && card.destination.includes("script-musique")) {
      navigate({ name: "music" });
    } else if (card.status !== "available") {
      setLockedCard(card);
    } else {
      navigate({ name: "features" });
    }
  }

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Tendances"
        subtitle="Les fonctionnalités mises en avant par l'équipe LuxenX en ce moment."
      />

      {data.trending.config.enabled === false || trending.length === 0 ? (
        <LxEmptyState
          illustration={<EmptyBoxIllustration />}
          title="Aucune tendance pour l'instant"
          description="L'équipe LuxenX n'a pas encore mis de fonctionnalité en avant. Consultez la page Fonctionnalités en attendant."
          action={
            <LxButton variant="secondary" size="sm" onClick={() => navigate({ name: "features" })}>
              Voir les fonctionnalités
            </LxButton>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {trending.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="lx-trending-hero"
              role="button"
              tabIndex={0}
              onClick={() => openCard(card)}
              onKeyDown={(e) => e.key === "Enter" && openCard(card)}
            >
              <div className="lx-trending-shine" aria-hidden />
              <div className="lx-trending-hero-illustration">
                <Illustration id={card.illustration} size={106} />
              </div>
              <div style={{ position: "relative", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <LxBadge tone="pink" glow>
                    <Flame size={11} /> #{i + 1} TENDANCE
                  </LxBadge>
                  <LxBadge tone="neutral">{card.category}</LxBadge>
                  {card.status !== "available" && <LxBadge tone="violet">{card.badge ?? "BIENTÔT"}</LxBadge>}
                </div>
                <h3 className="lx-title-lg" style={{ fontSize: 24 }}>{card.title}</h3>
                <p className="lx-subtitle" style={{ maxWidth: 560 }}>{card.description}</p>
              </div>
            </motion.div>
          ))}

          <div className="lx-card-grid">
            {data.cards
              .filter((c) => c.featured && !trending.some((t) => t.id === c.id))
              .map((c) => (
                <FeatureCardView key={c.id} card={c} onOpen={openCard} />
              ))}
          </div>
        </div>
      )}

      <LockedCardModal card={lockedCard} open={lockedCard !== null} onClose={() => setLockedCard(null)} />
    </div>
  );
}
