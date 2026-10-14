/**
 * Configuration de LuxenX Admin : adresse du backend, santé,
 * informations de version.
 */
import { useEffect, useState } from "react";
import { Server, Database, Info, RefreshCw, Rocket } from "lucide-react";
import { LxButton, LxBadge, LxInput, LxPanel, LxSectionHeader, LxSettingRow, useToast, LogoMark } from "@luxenx/ui";
import { useAdmin } from "../state/AdminState.js";

export function AdminSettingsPage() {
  const { backendUrl, backendHealth, updateBackendUrl, checkHealth, admin } = useAdmin();
  const toast = useToast();
  const [url, setUrl] = useState(backendUrl);
  const [saving, setSaving] = useState(false);
  const [gh, setGh] = useState({ owner: "", repo: "LuxenX" });
  const [ghSaving, setGhSaving] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ state: string; version?: string; progress?: number; error?: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const s = await window.luxadmin.settings.get();
      setGh({ owner: s.githubOwner ?? "", repo: s.githubRepo ?? "LuxenX" });
      setUpdateStatus(await window.luxadmin.updater.getStatus());
    })();
    const off = window.luxadmin.updater.onState((st) => setUpdateStatus(st));
    return off;
  }, []);

  async function saveGh() {
    setGhSaving(true);
    try {
      await window.luxadmin.settings.set({ githubOwner: gh.owner.trim(), githubRepo: gh.repo.trim() });
      toast.push("success", "Paramètres GitHub enregistrés pour la publication depuis ZIP.");
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setGhSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      new URL(url);
      await updateBackendUrl(url);
      toast.push("success", "Adresse du backend enregistrée. Reconnectez-vous si le serveur a changé.");
    } catch {
      toast.push("error", "Adresse invalide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lx-page">
      <LxSectionHeader title="Configuration" subtitle="Backend, santé du système et informations." />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Server size={17} style={{ color: "var(--lx-blue-soft)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Backend LuxenX</h3>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <LxInput label="Adresse HTTPS du backend" value={url} onChange={(e) => setUrl(e.target.value)} hint="Ex. https://luxenx-backend.onrender.com" />
              </div>
              <LxButton variant="secondary" loading={saving} disabled={url === backendUrl} onClick={() => void save()}>
                Enregistrer
              </LxButton>
            </div>
          </div>
          <LxSettingRow title="État de la connexion" description="Test en temps réel du backend et de Upstash Redis.">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <LxBadge tone={backendHealth?.status === "ok" ? "success" : "danger"}>
                <Server size={11} /> {backendHealth?.status ?? "…"}
              </LxBadge>
              <LxBadge tone={backendHealth?.redis === "ok" ? "success" : "warning"}>
                <Database size={11} /> {backendHealth?.redis ?? "…"}
              </LxBadge>
              <LxButton variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void checkHealth()}>
                Tester
              </LxButton>
            </div>
          </LxSettingRow>
        </LxPanel>

        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Rocket size={17} style={{ color: "var(--lx-violet-soft)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Publication GitHub</h3>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            <div className="lx-form-grid">
              <LxInput label="Propriétaire GitHub (votre compte)" value={gh.owner} placeholder="vicetradeshop-prog" onChange={(e) => setGh({ ...gh, owner: e.target.value })} />
              <LxInput label="Nom du dépôt" value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <LxButton variant="secondary" size="sm" loading={ghSaving} onClick={() => void saveGh()}>Enregistrer</LxButton>
              <span className="lx-small lx-muted" style={{ alignSelf: "center" }}>
                Utilisés par la section Versions, panneau « Publier depuis une archive ».
              </span>
            </div>
          </div>
        </LxPanel>

        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <RefreshCw size={17} style={{ color: "var(--lx-cyan)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Mises à jour de LuxenX Admin</h3>
          </div>
          <LxSettingRow
            title="État du canal admin"
            description={`Statut : ${updateStatus?.state ?? "…"}${updateStatus?.version ? ` · version ${updateStatus.version}` : ""}${updateStatus?.progress != null ? ` · ${updateStatus.progress}%` : ""}`}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <LxButton variant="secondary" size="sm" onClick={() => void window.luxadmin.updater.check()}>Vérifier</LxButton>
              {updateStatus?.state === "downloaded" && (
                <LxButton size="sm" onClick={() => void window.luxadmin.updater.install()}>Installer et relancer</LxButton>
              )}
            </div>
          </LxSettingRow>
          <div style={{ padding: "0 20px 18px" }}>
            <span className="lx-small lx-muted">
              Les mises à jour de la console sont téléchargées automatiquement depuis le canal
              « admin » des releases GitHub, vérifiées puis installées au redémarrage.
            </span>
          </div>
        </LxPanel>

        <LxPanel depth="flat" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LogoMark size={48} />
            <div>
              <div className="lx-title-md" style={{ fontSize: 16 }}>LuxenX Admin</div>
              <div className="lx-small lx-muted">
                Application Windows indépendante · connectée en tant que {admin?.email}
              </div>
              <div className="lx-small lx-muted" style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                <Info size={12} /> Les permissions administratives sont vérifiées par le serveur à chaque requête.
              </div>
            </div>
          </div>
        </LxPanel>
      </div>
    </div>
  );
}
