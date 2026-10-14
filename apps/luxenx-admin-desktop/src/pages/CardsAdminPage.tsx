/**
 * Gestion des cartes : création, édition complète, états de disponibilité,
 * réordonnancement et PRÉVISUALISATION avec le composant exact de LuxenX
 * (FeatureCardView partagé via @luxenx/ui).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Save, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react";
import type { CardStatus, FeatureCard, IllustrationId } from "@luxenx/shared";
import { CARD_STATUS_LABELS_FR, ILLUSTRATION_IDS } from "@luxenx/shared";
import {
  FeatureCardView,
  LxButton,
  LxBadge,
  LxInput,
  LxModal,
  LxSectionHeader,
  LxSelect,
  LxSpinner,
  LxTextarea,
  LxToggle,
  LxConfirmModal,
  useToast,
} from "@luxenx/ui";
import { api } from "../lib/api.js";

type Draft = Omit<FeatureCard, "updatedAt" | "publishedAt"> & { publishedAt: string | null };

const EMPTY_DRAFT: Draft = {
  id: "",
  title: "",
  description: "",
  category: "Général",
  illustration: "sparkle",
  accent: "violet",
  order: 100,
  status: "coming_soon",
  badge: null,
  featured: false,
  destination: "",
  publishedAt: null,
};

export function CardsAdminPage() {
  const toast = useToast();
  const [cards, setCards] = useState<FeatureCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState<FeatureCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureCard | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCards(await api.adminListCards());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewCard = useMemo<FeatureCard | null>(() => {
    if (!editing) return null;
    return {
      ...editing,
      id: editing.id || "apercu",
      title: editing.title || "Titre de la carte",
      description: editing.description || "La description apparaîtra ici.",
      destination: editing.destination || "/features/apercu",
      updatedAt: new Date().toISOString(),
    };
  }, [editing]);

  async function save() {
    if (!editing) return;
    if (!/^[a-z0-9-]{2,48}$/.test(editing.id)) {
      toast.push("error", "Identifiant : 2 à 48 caractères en minuscules (a-z, 0-9, tirets).");
      return;
    }
    if (editing.title.trim().length < 2 || editing.description.trim().length < 2) {
      toast.push("error", "Titre et description sont obligatoires (2 caractères minimum).");
      return;
    }
    const destination = editing.destination.trim() || `/features/${editing.id}`;
    if (!/^[a-z0-9/_:-]*$/.test(destination)) {
      toast.push("error", "Destination invalide : route interne en minuscules (ex. /features/ma-carte).");
      return;
    }
    setSaving(true);
    try {
      const saved = await api.adminUpsertCard({
        ...editing,
        destination,
        badge: editing.badge?.trim() ? editing.badge.trim() : null,
        publishedAt: editing.status === "available" ? editing.publishedAt ?? new Date().toISOString() : editing.publishedAt,
      });
      toast.push("success", `Carte « ${saved.title} » enregistrée. Les clients la verront à leur prochaine synchronisation.`);
      setEditing(null);
      await load();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Enregistrement refusé par le serveur.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await api.adminDeleteCard(deleteTarget.id);
      toast.push("success", `Carte « ${deleteTarget.title} » supprimée.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function move(card: FeatureCard, delta: number) {
    if (!cards) return;
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === card.id);
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swapIdx]!;
    await api.adminReorderCards([
      { id: a.id, order: b.order },
      { id: b.id, order: a.order },
    ]);
    await load();
  }

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Cartes de fonctionnalités"
        subtitle="Ce que vous modifiez ici apparaît dans LuxenX sans réinstallation (prochaine synchronisation)."
        action={
          <LxButton size="sm" icon={<Plus size={15} />} onClick={() => { setEditing({ ...EMPTY_DRAFT }); setIsNew(true); }}>
            Nouvelle carte
          </LxButton>
        }
      />

      {!cards && !error && (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <LxSpinner />
        </div>
      )}
      {error && <div className="lx-glass-flat" style={{ padding: 18, color: "var(--lx-danger)" }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(cards ?? []).map((c, i) => (
          <motion.div key={c.id} className="lx-glass-flat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button className="lx-btn lx-btn-ghost lx-btn-sm" style={{ padding: 2 }} onClick={() => void move(c, -1)} aria-label="Monter"><ArrowUp size={14} /></button>
              <button className="lx-btn lx-btn-ghost lx-btn-sm" style={{ padding: 2 }} onClick={() => void move(c, 1)} aria-label="Descendre"><ArrowDown size={14} /></button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ color: "var(--lx-text)" }}>{c.title}</strong>
                <LxBadge tone={c.status === "available" ? "success" : c.status === "coming_soon" ? "violet" : c.status === "maintenance" ? "warning" : "neutral"}>
                  {CARD_STATUS_LABELS_FR[c.status]}
                </LxBadge>
                {c.featured && <LxBadge tone="pink">MISE EN AVANT</LxBadge>}
                <span className="lx-small lx-muted">ordre {c.order} · {c.category} · {c.id}</span>
              </div>
              <div className="lx-small lx-muted" style={{ marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.description}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <LxButton variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setPreview(c)}>Aperçu</LxButton>
              <LxButton variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => { setEditing({ ...c }); setIsNew(false); }}>Modifier</LxButton>
              <LxButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteTarget(c)} aria-label="Supprimer" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ---- Éditeur ---- */}
      <LxModal open={editing !== null} onClose={() => setEditing(null)} title={isNew ? "Nouvelle carte" : "Modifier la carte"} width={700}>
        {editing && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <LxInput
                label="Identifiant (immuable après création)"
                value={editing.id}
                disabled={!isNew}
                placeholder="ma-fonctionnalite"
                onChange={(e) => setEditing({ ...editing, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                hint="minuscules, chiffres, tirets"
              />
              <LxInput label="Titre" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <LxTextarea label="Description courte" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <LxInput label="Catégorie" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <LxSelect
                label="État de disponibilité"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as CardStatus })}
                options={(Object.keys(CARD_STATUS_LABELS_FR) as CardStatus[]).map((s) => ({ value: s, label: CARD_STATUS_LABELS_FR[s] }))}
              />
              <LxInput
                label="Badge personnalisé (optionnel)"
                value={editing.badge ?? ""}
                placeholder="ARRIVE PROCHAINEMENT"
                onChange={(e) => setEditing({ ...editing, badge: e.target.value || null })}
              />
              <LxSelect
                label="Illustration (vectorielle 2D)"
                value={editing.illustration}
                onChange={(e) => setEditing({ ...editing, illustration: e.target.value as IllustrationId })}
                options={ILLUSTRATION_IDS.map((i) => ({ value: i, label: i }))}
              />
              <LxSelect
                label="Accent"
                value={editing.accent}
                onChange={(e) => setEditing({ ...editing, accent: e.target.value as Draft["accent"] })}
                options={[
                  { value: "violet", label: "Violet" },
                  { value: "blue", label: "Bleu électrique" },
                  { value: "pink", label: "Rose" },
                  { value: "lavender", label: "Lavande" },
                ]}
              />
              <LxInput
                label="Ordre d'affichage"
                type="number"
                value={String(editing.order)}
                onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) || 0 })}
              />
              <LxInput
                label="Route de destination"
                value={editing.destination}
                placeholder={`/features/${editing.id || "ma-carte"}`}
                onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
                hint="Route interne validée — jamais de code distant."
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <LxToggle checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Mise en avant" />
                <span className="lx-small">Marquer comme « mise en avant »</span>
              </div>
            </div>

            {/* Prévisualisation exacte du rendu LuxenX */}
            <div>
              <div className="lx-small lx-muted" style={{ marginBottom: 10 }}>Prévisualisation (rendu exact de LuxenX)</div>
              <div style={{ background: "linear-gradient(160deg, #0a0a14, #06060a)", borderRadius: 22, padding: 18 }}>
                {previewCard && (
                  <div style={{ pointerEvents: "none" }}>
                    <FeatureCardView card={previewCard} onOpen={() => undefined} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <LxButton variant="ghost" onClick={() => setEditing(null)}>Annuler</LxButton>
              <LxButton icon={<Save size={15} />} loading={saving} onClick={() => void save()}>
                Enregistrer la carte
              </LxButton>
            </div>
          </div>
        )}
      </LxModal>

      {/* ---- Aperçu rapide ---- */}
      <LxModal open={preview !== null} onClose={() => setPreview(null)} title="Aperçu dans LuxenX" width={460}>
        {preview && (
          <div style={{ background: "linear-gradient(160deg, #0a0a14, #06060a)", borderRadius: 22, padding: 18, pointerEvents: "none" }}>
            <FeatureCardView card={preview} onOpen={() => undefined} />
          </div>
        )}
      </LxModal>

      <LxConfirmModal
        open={deleteTarget !== null}
        title="Supprimer cette carte ?"
        danger
        requireText="SUPPRIMER"
        message={deleteTarget ? `« ${deleteTarget.title} » disparaîtra de toutes les applications LuxenX à leur prochaine synchronisation.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
