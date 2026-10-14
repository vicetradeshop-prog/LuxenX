/**
 * Tendances : sélection des cartes mises en avant dans LuxenX.
 * Épinglage, priorité, fenêtre de diffusion, nombre de cartes,
 * activation de la section, prévisualisation du tableau de bord.
 * Configuration conservée dans Upstash via le backend.
 */
import { useCallback, useEffect, useState } from "react";
import { Pin, PinOff, Save, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import type { FeatureCard, TrendingConfig, TrendingEntry } from "@luxenx/shared";
import {
  FeatureCardView,
  LxButton,
  LxBadge,
  LxInput,
  LxPanel,
  LxSectionHeader,
  LxSelect,
  LxSpinner,
  LxToggle,
  useToast,
} from "@luxenx/ui";
import { api } from "../lib/api.js";

export function TrendingAdminPage() {
  const toast = useToast();
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [config, setConfig] = useState<TrendingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addCardId, setAddCardId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allCards, cfg] = await Promise.all([api.adminListCards(), api.adminGetTrending()]);
      setCards(allCards);
      setConfig(cfg);
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !config) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 70 }}>
        <LxSpinner />
      </div>
    );
  }

  const cardById = new Map(cards.map((c) => [c.id, c]));
  const inWindow = (e: TrendingEntry): boolean => {
    const now = new Date().toISOString();
    return (!e.startsAt || e.startsAt <= now) && (!e.endsAt || e.endsAt >= now);
  };

  const sorted = [...config.entries].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.priority - a.priority,
  );

  function patch(next: Partial<TrendingConfig>) {
    setConfig((c) => (c ? { ...c, ...next } : c));
  }

  function patchEntry(cardId: string, next: Partial<TrendingEntry>) {
    patch({ entries: config!.entries.map((e) => (e.cardId === cardId ? { ...e, ...next } : e)) });
  }

  function addEntry() {
    if (!addCardId || config!.entries.some((e) => e.cardId === addCardId)) return;
    patch({
      entries: [...config!.entries, { cardId: addCardId, pinned: false, priority: 50, startsAt: null, endsAt: null }],
    });
    setAddCardId("");
  }

  function removeEntry(cardId: string) {
    patch({ entries: config!.entries.filter((e) => e.cardId !== cardId) });
  }

  function moveEntry(cardId: string, delta: number) {
    const entries = [...config!.entries];
    const idx = entries.findIndex((e) => e.cardId === cardId);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= entries.length) return;
    // Échange les priorités pour refléter l'ordre choisi.
    const a = entries[idx]!;
    const b = entries[to]!;
    const pa = a.priority;
    entries[idx] = { ...a, priority: b.priority };
    entries[to] = { ...b, priority: pa };
    patch({ entries });
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.adminPutTrending(config as unknown as Record<string, unknown>);
      setConfig(saved);
      toast.push("success", "Tendances enregistrées. Les clients synchroniseront au démarrage ou sous 5 minutes.");
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Enregistrement refusé.");
    } finally {
      setSaving(false);
    }
  }

  const visibleCards = sorted
    .filter(inWindow)
    .slice(0, config.enabled ? config.maxCards : 0)
    .map((e) => cardById.get(e.cardId))
    .filter((c): c is FeatureCard => !!c);

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Tendances"
        subtitle="Choisissez les cartes mises en avant sur le tableau de bord des utilisateurs."
        action={
          <LxButton size="sm" icon={<Save size={15} />} loading={saving} onClick={() => void save()}>
            Enregistrer
          </LxButton>
        }
      />

      <LxPanel depth="glass" style={{ padding: 20, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LxToggle checked={config.enabled} onChange={(v) => patch({ enabled: v })} label="Section tendances" />
            <div>
              <div style={{ fontWeight: 650, fontSize: 14 }}>Section activée</div>
              <div className="lx-small lx-muted">Si désactivée, aucune carte n'est mise en avant.</div>
            </div>
          </div>
          <div style={{ width: 160 }}>
            <LxInput
              label="Nombre de cartes affichées"
              type="number"
              min={1}
              max={12}
              value={String(config.maxCards)}
              onChange={(e) => patch({ maxCards: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            />
          </div>
        </div>
      </LxPanel>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22, alignItems: "start" }}>
        {/* ---- Configuration ---- */}
        <LxPanel depth="flat" style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <LxSelect
                label="Ajouter une carte"
                value={addCardId}
                onChange={(e) => setAddCardId(e.target.value)}
                options={[
                  { value: "", label: "— choisir une carte —" },
                  ...cards
                    .filter((c) => !config.entries.some((e) => e.cardId === c.id))
                    .map((c) => ({ value: c.id, label: `${c.title} (${c.id})` })),
                ]}
              />
            </div>
            <LxButton variant="secondary" style={{ marginTop: 26 }} icon={<Plus size={15} />} onClick={addEntry} disabled={!addCardId}>
              Ajouter
            </LxButton>
          </div>

          {config.entries.length === 0 && (
            <div className="lx-small lx-muted" style={{ padding: "14px 4px" }}>
              Aucune carte sélectionnée. Ajoutez-en une ci-dessus.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((e) => {
              const card = cardById.get(e.cardId);
              return (
                <div key={e.cardId} className="lx-glass" style={{ padding: 14, borderRadius: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <button className="lx-btn lx-btn-ghost lx-btn-sm" style={{ padding: 1 }} onClick={() => moveEntry(e.cardId, -1)} aria-label="Monter"><ArrowUp size={13} /></button>
                      <button className="lx-btn lx-btn-ghost lx-btn-sm" style={{ padding: 1 }} onClick={() => moveEntry(e.cardId, 1)} aria-label="Descendre"><ArrowDown size={13} /></button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 650, fontSize: 14 }}>{card?.title ?? e.cardId}</div>
                      <div className="lx-small lx-muted">
                        priorité {e.priority} · {inWindow(e) ? "dans la fenêtre" : "hors fenêtre (non affichée)"}
                        {!config.enabled && " · section désactivée"}
                      </div>
                    </div>
                    <LxButton
                      variant="ghost"
                      size="sm"
                      icon={e.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      onClick={() => patchEntry(e.cardId, { pinned: !e.pinned })}
                    >
                      {e.pinned ? "Épinglée" : "Épingler"}
                    </LxButton>
                    <LxButton variant="ghost" size="sm" icon={<X size={14} />} onClick={() => removeEntry(e.cardId)} aria-label="Retirer" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 10, marginTop: 10 }}>
                    <LxInput
                      label="Priorité"
                      type="number"
                      value={String(e.priority)}
                      onChange={(ev) => patchEntry(e.cardId, { priority: Math.max(0, Math.min(100, Number(ev.target.value) || 0)) })}
                    />
                    <LxInput
                      label="Début (optionnel)"
                      type="datetime-local"
                      value={e.startsAt ? e.startsAt.slice(0, 16) : ""}
                      onChange={(ev) => patchEntry(e.cardId, { startsAt: ev.target.value ? new Date(ev.target.value).toISOString() : null })}
                    />
                    <LxInput
                      label="Fin (optionnel)"
                      type="datetime-local"
                      value={e.endsAt ? e.endsAt.slice(0, 16) : ""}
                      onChange={(ev) => patchEntry(e.cardId, { endsAt: ev.target.value ? new Date(ev.target.value).toISOString() : null })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </LxPanel>

        {/* ---- Prévisualisation du tableau de bord ---- */}
        <div>
          <div className="lx-small lx-muted" style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
            Prévisualisation du tableau de bord utilisateur
            <LxBadge tone={config.enabled ? "success" : "neutral"}>{config.enabled ? "activée" : "désactivée"}</LxBadge>
          </div>
          <div style={{ background: "linear-gradient(160deg, #0a0a14, #06060a)", borderRadius: 24, padding: 20, minHeight: 420 }}>
            {visibleCards.length === 0 ? (
              <div className="lx-small lx-muted" style={{ textAlign: "center", padding: 60 }}>
                {config.enabled ? "Aucune carte dans la fenêtre de diffusion." : "Section tendances désactivée."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, pointerEvents: "none" }}>
                {visibleCards.map((c) => (
                  <FeatureCardView key={c.id} card={c} trending onOpen={() => undefined} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
