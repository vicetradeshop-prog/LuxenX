/**
 * Fonctionnalités : toutes les cartes avec filtres par catégorie et état.
 */
import { useMemo, useState } from "react";
import type { CardStatus, FeatureCard } from "@luxenx/shared";
import { CARD_STATUS_LABELS_FR } from "@luxenx/shared";
import { LxEmptyState, LxSectionHeader, EmptyBoxIllustration, LxSpinner } from "@luxenx/ui";
import { useApp } from "../state/AppState.js";
import { navigate } from "../lib/nav.js";
import { FeatureCardView } from "../components/FeatureCardView.js";
import { LockedCardModal } from "../components/LockedCardModal.js";

type Filter = "all" | CardStatus;

export function FeaturesPage() {
  const { data } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");
  const [lockedCard, setLockedCard] = useState<FeatureCard | null>(null);

  const categories = useMemo(
    () => ["all", ...new Set(data.cards.map((c) => c.category))],
    [data.cards],
  );

  const filtered = useMemo(
    () =>
      data.cards
        .filter((c) => (filter === "all" ? true : c.status === filter))
        .filter((c) => (category === "all" ? true : c.category === category)),
    [data.cards, filter, category],
  );

  function openCard(card: FeatureCard) {
    if (card.status === "available" && card.destination.includes("script-musique")) {
      navigate({ name: "music" });
    } else if (card.status === "available") {
      navigate({ name: "dashboard" });
    } else {
      setLockedCard(card);
    }
  }

  const chip = (active: boolean) =>
    `lx-btn lx-btn-sm ${active ? "lx-btn-primary" : "lx-btn-secondary"}`;

  const loading = data.fetchedAt === null && !data.error;

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Fonctionnalités"
        subtitle="Découvrez les solutions LuxenX. Les cartes verrouillées restent consultables."
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "available", "coming_soon", "maintenance"] as Filter[]).map((f) => (
          <button key={f} className={chip(filter === f)} onClick={() => setFilter(f)}>
            {f === "all" ? "Toutes" : CARD_STATUS_LABELS_FR[f]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
        {categories.map((c) => (
          <button key={c} className={chip(category === c)} onClick={() => setCategory(c)}>
            {c === "all" ? "Toutes catégories" : c}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <LxSpinner size={26} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <LxEmptyState
          illustration={<EmptyBoxIllustration />}
          title="Aucune carte dans cette sélection"
          description="Essayez un autre filtre ou revenez plus tard : de nouvelles fonctionnalités arrivent régulièrement."
        />
      )}

      <div className="lx-card-grid">
        {filtered.map((c) => (
          <FeatureCardView key={c.id} card={c} trending={c.featured} onOpen={openCard} />
        ))}
      </div>

      <LockedCardModal card={lockedCard} open={lockedCard !== null} onClose={() => setLockedCard(null)} />
    </div>
  );
}
