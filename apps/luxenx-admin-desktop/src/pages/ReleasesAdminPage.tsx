/**
 * Versions & publication : registre des releases LuxenX.
 *
 * Principe de fiabilité : la publication définitive correspond à de
 * VRAIS fichiers sur GitHub Releases (déposés par publier.bat via GitHub
 * CLI, authentification sécurisée). Ce panneau :
 *  - affiche la version publiée et l'historique ;
 *  - prépare les notes et le numéro de version (brouillon dans Upstash) ;
 *  - exécute une checklist avant publication (semver, doublons, GitHub) ;
 *  - marque la release comme publiée UNIQUEMENT si la release GitHub
 *    existe (vérification serveur) ;
 *  - journalise chaque opération.
 *
 * Les jetons GitHub restent côté backend/processus local : jamais
 * transmis aux applications clientes.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Rocket, ExternalLink, FileWarning } from "lucide-react";
import type { ReleaseInfo } from "@luxenx/shared";
import {
  LxButton,
  LxBadge,
  LxInput,
  LxPanel,
  LxSectionHeader,
  LxSpinner,
  LxTextarea,
  LxConfirmModal,
  useToast,
} from "@luxenx/ui";
import { api } from "../lib/api.js";

interface Check {
  label: string;
  state: "wait" | "ok" | "ko";
  detail?: string;
}

export function ReleasesAdminPage() {
  const toast = useToast();
  const [releases, setReleases] = useState<ReleaseInfo[] | null>(null);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta">("stable");
  const [mandatory, setMandatory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReleases(await api.adminListReleases());
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDraft() {
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
      toast.push("error", "Numéro de version invalide (format attendu : 1.2.3).");
      return;
    }
    if (notes.trim().length < 5) {
      toast.push("error", "Les notes de version sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      const created = await api.adminCreateRelease({ version, channel, notes, mandatory, assets: [] });
      toast.push("success", `Brouillon v${created.version} enregistré dans Upstash.`);
      await load();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Création refusée.");
    } finally {
      setBusy(false);
    }
  }

  /** Checklist préalable : cohérence, doublons, existence GitHub. */
  async function runChecks(target: string) {
    setChecks([
      { label: "Format semver valide", state: /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(target) ? "ok" : "ko" },
      { label: "Brouillon enregistré dans Upstash", state: "wait" },
      { label: "Release GitHub correspondante", state: "wait" },
      { label: "Aucune publication en doublon", state: "wait" },
    ]);
    const list = releases ?? (await api.adminListReleases());
    const draft = list.find((r) => r.version === target);
    const already = draft?.status === "published";
    const gh = await api.adminCheckGithubRelease(target);

    setChecks([
      { label: "Format semver valide", state: /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(target) ? "ok" : "ko" },
      {
        label: "Brouillon enregistré dans Upstash",
        state: draft ? "ok" : "ko",
        detail: draft ? `statut actuel : ${draft.status}` : "créez d'abord le brouillon",
      },
      {
        label: "Release GitHub correspondante",
        state: gh.exists ? "ok" : "ko",
        detail: gh.message,
      },
      {
        label: "Aucune publication en doublon",
        state: already ? "ko" : "ok",
        detail: already ? "cette version est déjà publiée" : undefined,
      },
    ]);
  }

  async function publish() {
    if (!publishTarget) return;
    setBusy(true);
    try {
      const published = await api.adminPublishRelease(publishTarget);
      toast.push("success", `Version v${published.version} publiée dans le registre.`);
      setConfirmOpen(false);
      setPublishTarget(null);
      setChecks(null);
      await load();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Publication refusée par le serveur.");
    } finally {
      setBusy(false);
    }
  }

  const allChecksOk = checks?.every((c) => c.state === "ok") ?? false;

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Versions & publication"
        subtitle="Registre des releases LuxenX. La publication réelle des fichiers passe par publier.bat (GitHub CLI) ; ce panneau vérifie et enregistre."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 22, alignItems: "start" }}>
        {/* ---- Préparer une version ---- */}
        <LxPanel depth="deep" style={{ padding: 24 }}>
          <h3 className="lx-title-md" style={{ fontSize: 16, marginBottom: 16 }}>Préparer une publication</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="lx-form-grid">
              <LxInput label="Numéro de version" value={version} placeholder="1.2.0" onChange={(e) => setVersion(e.target.value.trim())} />
              <div className="lx-field">
                <span className="lx-field-label">Canal</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className={`lx-btn lx-btn-sm ${channel === "stable" ? "lx-btn-primary" : "lx-btn-secondary"}`} onClick={() => setChannel("stable")}>stable</button>
                  <button className={`lx-btn lx-btn-sm ${channel === "beta" ? "lx-btn-primary" : "lx-btn-secondary"}`} onClick={() => setChannel("beta")}>bêta</button>
                </div>
              </div>
            </div>
            <LxTextarea
              label="Notes de version (Markdown)"
              value={notes}
              placeholder={"## Nouveautés\n- …\n\n## Corrections\n- …"}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: 160 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
              <span className="lx-small">Mise à jour obligatoire (bloque les versions incompatibles)</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <LxButton icon={<Rocket size={15} />} loading={busy} onClick={() => void createDraft()}>
                Enregistrer le brouillon
              </LxButton>
              <LxButton
                variant="secondary"
                disabled={!version}
                onClick={() => void runChecks(version)}
                icon={<CheckCircle2 size={15} />}
              >
                Lancer les vérifications
              </LxButton>
            </div>

            {checks && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {checks.map((c, i) => (
                  <div key={i} className={`lx-checklist-item lx-checklist-${c.state}`}>
                    {c.state === "ok" && <CheckCircle2 size={16} />}
                    {c.state === "ko" && <XCircle size={16} />}
                    {c.state === "wait" && <Clock size={16} />}
                    <span>{c.label}</span>
                    {c.detail && <span className="lx-small" style={{ marginLeft: "auto", opacity: 0.8, textAlign: "right" }}>{c.detail}</span>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <LxButton
                    disabled={!allChecksOk}
                    onClick={() => { setPublishTarget(version); setConfirmOpen(true); }}
                  >
                    Publier v{version}
                  </LxButton>
                  {!allChecksOk && (
                    <span className="lx-small lx-muted" style={{ alignSelf: "center", display: "flex", gap: 6 }}>
                      <FileWarning size={13} /> Publication bloquée tant qu'un contrôle échoue — c'est volontaire.
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </LxPanel>

        {/* ---- Historique ---- */}
        <LxPanel depth="glass" style={{ padding: 24 }}>
          <h3 className="lx-title-md" style={{ fontSize: 16, marginBottom: 14 }}>
            Historique des publications
          </h3>
          {releases === null && (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <LxSpinner />
            </div>
          )}
          {releases !== null && releases.length === 0 && (
            <div className="lx-small lx-muted" style={{ padding: 12 }}>
              Aucune version enregistrée. Préparez votre première publication, puis lancez
              publier.bat pour téléverser les artefacts sur GitHub.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(releases ?? []).map((r) => (
              <div key={r.version} className="lx-glass-flat" style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: "var(--lx-text)", fontSize: 15 }}>v{r.version}</strong>
                  <LxBadge tone={r.status === "published" ? "success" : r.status === "draft" ? "neutral" : "danger"}>
                    {r.status === "published" ? "PUBLIÉE" : r.status === "draft" ? "BROUILLON" : "ÉCHEC"}
                  </LxBadge>
                  <LxBadge tone={r.channel === "stable" ? "blue" : "violet"}>{r.channel}</LxBadge>
                  {r.mandatory && <LxBadge tone="warning">OBLIGATOIRE</LxBadge>}
                  <span className="lx-small lx-muted" style={{ marginLeft: "auto" }}>
                    {new Date(r.publishedAt).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="lx-small lx-muted" style={{ marginTop: 6, whiteSpace: "pre-wrap", maxHeight: 70, overflow: "hidden" }}>
                  {r.notes.slice(0, 220)}
                  {r.notes.length > 220 ? "…" : ""}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {r.githubReleaseUrl && (
                    <LxButton variant="ghost" size="sm" icon={<ExternalLink size={13} />} onClick={() => void window.luxadmin.shell.openExternal(r.githubReleaseUrl!)}>
                      Voir sur GitHub
                    </LxButton>
                  )}
                  {r.status === "draft" && (
                    <LxButton variant="secondary" size="sm" onClick={() => void runChecks(r.version)}>
                      Vérifier
                    </LxButton>
                  )}
                  {r.status !== "published" && (
                    <LxButton
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await api.adminDeleteRelease(r.version);
                        toast.push("info", `Brouillon v${r.version} supprimé.`);
                        await load();
                      }}
                    >
                      Supprimer
                    </LxButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </LxPanel>
      </div>

      <LxConfirmModal
        open={confirmOpen}
        title={`Publier la version v${publishTarget ?? ""} ?`}
        requireText={publishTarget ?? ""}
        confirmLabel={busy ? "Publication…" : "Publier définitivement"}
        message={
          <div>
            <p style={{ marginBottom: 10 }}>
              Récapitulatif : version <strong>v{publishTarget}</strong>, canal <strong>{channel}</strong>
              {mandatory ? ", mise à jour obligatoire" : ""}.
            </p>
            <p className="lx-small lx-muted">
              Les vérifications sont toutes vertes. Cette action marque la release comme publiée dans
              le registre LuxenX (elle ne remplace jamais une version déjà publiée). Les fichiers
              doivent avoir été téléversés sur GitHub par publier.bat.
            </p>
          </div>
        }
        onCancel={() => { setConfirmOpen(false); setPublishTarget(null); }}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
