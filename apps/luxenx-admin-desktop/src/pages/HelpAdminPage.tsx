/**
 * FAQ & guides : édition du contenu d'aide diffusé à distance dans LuxenX.
 * Le contenu est déclaratif (validé par Zod côté serveur) — jamais de code.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, BookOpen, MessageCircleQuestion } from "lucide-react";
import type { FaqItem, Guide, HelpContent, IllustrationId } from "@luxenx/shared";
import { ILLUSTRATION_IDS } from "@luxenx/shared";
import {
  LxButton,
  LxInput,
  LxPanel,
  LxSectionHeader,
  LxSelect,
  LxSpinner,
  LxTextarea,
  LxModal,
  useToast,
} from "@luxenx/ui";
import { api } from "../lib/api.js";

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "element";

export function HelpAdminPage() {
  const toast = useToast();
  const [help, setHelp] = useState<HelpContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [faqEdit, setFaqEdit] = useState<FaqItem | null>(null);
  const [guideEdit, setGuideEdit] = useState<Guide | null>(null);

  const load = useCallback(async () => {
    try {
      setHelp(await api.adminGetHelp());
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: HelpContent) {
    setSaving(true);
    try {
      setHelp(await api.adminPutHelp(next));
      toast.push("success", "Contenu d'aide enregistré. LuxenX le récupérera à sa prochaine synchronisation.");
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Enregistrement refusé.");
    } finally {
      setSaving(false);
    }
  }

  if (!help) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 70 }}>
        <LxSpinner />
      </div>
    );
  }

  function upsertFaq(item: FaqItem) {
    const exists = help!.faq.some((f) => f.id === item.id);
    const faq = exists ? help!.faq.map((f) => (f.id === item.id ? item : f)) : [...help!.faq, item];
    setHelp({ ...help!, faq });
    setFaqEdit(null);
  }

  function upsertGuide(item: Guide) {
    const exists = help!.guides.some((g) => g.id === item.id);
    const guides = exists ? help!.guides.map((g) => (g.id === item.id ? item : g)) : [...help!.guides, item];
    setHelp({ ...help!, guides });
    setGuideEdit(null);
  }

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="FAQ & guides"
        subtitle="Contenu d'aide de LuxenX, modifiable à distance sans recompiler l'application."
        action={
          <LxButton size="sm" icon={<Save size={15} />} loading={saving} onClick={() => void save(help)}>
            Publier les modifications
          </LxButton>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
        {/* FAQ */}
        <LxPanel depth="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <h3 className="lx-title-md" style={{ fontSize: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <MessageCircleQuestion size={16} style={{ color: "var(--lx-violet-soft)" }} /> Questions fréquentes ({help.faq.length})
            </h3>
            <LxButton
              variant="secondary"
              size="sm"
              style={{ marginLeft: "auto" }}
              icon={<Plus size={14} />}
              onClick={() => setFaqEdit({ id: slug(`faq-${Date.now()}`), question: "", answer: "" })}
            >
              Ajouter
            </LxButton>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {help.faq.map((f) => (
              <div key={f.id} className="lx-glass-flat" style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--lx-text)" }}>{f.question || "(sans question)"}</div>
                  <div className="lx-small lx-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.answer.slice(0, 110)}
                  </div>
                </div>
                <LxButton variant="ghost" size="sm" onClick={() => setFaqEdit(f)}>Éditer</LxButton>
                <LxButton variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setHelp({ ...help, faq: help.faq.filter((x) => x.id !== f.id) })} aria-label="Supprimer" />
              </div>
            ))}
          </div>
        </LxPanel>

        {/* Guides */}
        <LxPanel depth="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <h3 className="lx-title-md" style={{ fontSize: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <BookOpen size={16} style={{ color: "var(--lx-cyan)" }} /> Guides ({help.guides.length})
            </h3>
            <LxButton
              variant="secondary"
              size="sm"
              style={{ marginLeft: "auto" }}
              icon={<Plus size={14} />}
              onClick={() =>
                setGuideEdit({
                  id: slug(`guide-${Date.now()}`),
                  title: "",
                  category: "Transfert",
                  illustration: "sparkle",
                  steps: [{ title: "", body: "" }],
                })
              }
            >
              Ajouter
            </LxButton>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {help.guides.map((g) => (
              <div key={g.id} className="lx-glass-flat" style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--lx-text)" }}>{g.title || "(sans titre)"}</div>
                  <div className="lx-small lx-muted">{g.category} · {g.steps.length} étapes</div>
                </div>
                <LxButton variant="ghost" size="sm" onClick={() => setGuideEdit(g)}>Éditer</LxButton>
                <LxButton variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setHelp({ ...help, guides: help.guides.filter((x) => x.id !== g.id) })} aria-label="Supprimer" />
              </div>
            ))}
          </div>
        </LxPanel>
      </div>

      {/* Modale FAQ */}
      <LxModal open={faqEdit !== null} onClose={() => setFaqEdit(null)} title="Question fréquente" width={560}>
        {faqEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <LxInput label="Identifiant" value={faqEdit.id} onChange={(e) => setFaqEdit({ ...faqEdit, id: slug(e.target.value) })} />
            <LxInput label="Question" value={faqEdit.question} onChange={(e) => setFaqEdit({ ...faqEdit, question: e.target.value })} />
            <LxTextarea label="Réponse" value={faqEdit.answer} onChange={(e) => setFaqEdit({ ...faqEdit, answer: e.target.value })} style={{ minHeight: 140 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <LxButton variant="ghost" onClick={() => setFaqEdit(null)}>Annuler</LxButton>
              <LxButton onClick={() => upsertFaq(faqEdit)}>Valider</LxButton>
            </div>
          </div>
        )}
      </LxModal>

      {/* Modale guide */}
      <LxModal open={guideEdit !== null} onClose={() => setGuideEdit(null)} title="Guide illustré" width={640}>
        {guideEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="lx-form-grid">
              <LxInput label="Titre" value={guideEdit.title} onChange={(e) => setGuideEdit({ ...guideEdit, title: e.target.value })} />
              <LxInput label="Catégorie" value={guideEdit.category} onChange={(e) => setGuideEdit({ ...guideEdit, category: e.target.value })} />
              <LxSelect
                label="Illustration (2D)"
                value={guideEdit.illustration}
                onChange={(e) => setGuideEdit({ ...guideEdit, illustration: e.target.value as IllustrationId })}
                options={ILLUSTRATION_IDS.map((i) => ({ value: i, label: i }))}
              />
              <LxInput label="Identifiant" value={guideEdit.id} onChange={(e) => setGuideEdit({ ...guideEdit, id: slug(e.target.value) })} />
            </div>
            <div>
              <div className="lx-field-label" style={{ marginBottom: 8 }}>Étapes numérotées</div>
              {guideEdit.steps.map((s, i) => (
                <div key={i} className="lx-glass-flat" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <LxBadgeLocal n={i + 1} />
                    <LxInput placeholder="Titre de l'étape" value={s.title} onChange={(e) => {
                      const steps = [...guideEdit.steps];
                      steps[i] = { ...s, title: e.target.value };
                      setGuideEdit({ ...guideEdit, steps });
                    }} />
                    <LxButton variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setGuideEdit({ ...guideEdit, steps: guideEdit.steps.filter((_, j) => j !== i) })} aria-label="Supprimer l'étape" />
                  </div>
                  <LxTextarea placeholder="Explication…" value={s.body} onChange={(e) => {
                    const steps = [...guideEdit.steps];
                    steps[i] = { ...s, body: e.target.value };
                    setGuideEdit({ ...guideEdit, steps });
                  }} style={{ minHeight: 60 }} />
                </div>
              ))}
              <LxButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setGuideEdit({ ...guideEdit, steps: [...guideEdit.steps, { title: "", body: "" }] })}>
                Ajouter une étape
              </LxButton>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <LxButton variant="ghost" onClick={() => setGuideEdit(null)}>Annuler</LxButton>
              <LxButton onClick={() => upsertGuide(guideEdit)}>Valider</LxButton>
            </div>
          </div>
        )}
      </LxModal>
    </div>
  );
}

function LxBadgeLocal({ n }: { n: number }) {
  return (
    <span
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 9,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        color: "#fff",
        background: "linear-gradient(135deg, rgba(139,92,246,0.85), rgba(79,124,255,0.75))",
      }}
    >
      {n}
    </span>
  );
}
