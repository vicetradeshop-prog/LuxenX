/**
 * Carte de fonctionnalité — élément central du tableau de bord.
 * Chaque carte possède une identité graphique (accent, illustration 2D,
 * badge, lueur) et des interactions animées. Les cartes non disponibles
 * conservent un style premium et ouvrent une explication au clic.
 */
import { motion } from "framer-motion";
import { Lock, Wrench, PauseCircle, ArrowUpRight } from "lucide-react";
import type { CardStatus, FeatureCard } from "@luxenx/shared";
import { CARD_STATUS_LABELS_FR } from "@luxenx/shared";
import { Illustration } from "./illustrations.js";
import { LxBadge } from "./components.js";

function statusBadge(status: CardStatus, custom?: string | null) {
  switch (status) {
    case "available":
      return null; // pas de badge : la carte parle d'elle-même
    case "coming_soon":
      return <LxBadge tone="violet" glow>{custom ?? "ARRIVE PROCHAINEMENT"}</LxBadge>;
    case "maintenance":
      return (
        <LxBadge tone="warning">
          <Wrench size={11} /> {custom ?? "EN MAINTENANCE"}
        </LxBadge>
      );
    case "disabled":
      return (
        <LxBadge tone="neutral">
          <PauseCircle size={11} /> {custom ?? CARD_STATUS_LABELS_FR.disabled}
        </LxBadge>
      );
    default:
      return null;
  }
}

export interface FeatureCardViewProps {
  card: FeatureCard;
  trending?: boolean;
  onOpen: (card: FeatureCard) => void;
}

export function FeatureCardView({ card, trending = false, onOpen }: FeatureCardViewProps) {
  const locked = card.status !== "available";

  return (
    <motion.div
      className={[
        "lx-glass",
        "lx-feature-card",
        `lx-card-accent-${card.accent}`,
        locked ? "lx-feature-card-locked" : "",
        trending ? "lx-feature-card-trending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`${card.title} — ${CARD_STATUS_LABELS_FR[card.status]}`}
      whileHover={locked ? { scale: 1.006 } : { scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(card);
        }
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div className="lx-feature-card-illustration">
          <Illustration id={card.illustration} size={62} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {trending && <LxBadge tone="pink">TENDANCE</LxBadge>}
          {statusBadge(card.status, card.badge)}
          {locked && <Lock size={15} style={{ color: "var(--lx-text-muted)" }} aria-label="Verrouillé" />}
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 className="lx-title-md" style={{ fontSize: 17.5 }}>
            {card.title}
          </h3>
          {!locked && <ArrowUpRight size={16} style={{ color: "var(--lx-violet-soft)" }} />}
        </div>
        <p
          className="lx-subtitle"
          style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {card.description}
        </p>
        <div className="lx-small lx-muted" style={{ marginTop: 10, letterSpacing: "0.04em" }}>
          {card.category.toUpperCase()}
        </div>
      </div>
    </motion.div>
  );
}
