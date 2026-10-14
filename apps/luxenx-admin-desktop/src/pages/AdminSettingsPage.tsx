/**
 * Configuration de LuxenX Admin : adresse du backend, santé,
 * informations de version.
 */
import { useState } from "react";
import { Server, Database, Info, RefreshCw } from "lucide-react";
import { LxButton, LxBadge, LxInput, LxPanel, LxSectionHeader, LxSettingRow, useToast, LogoMark } from "@luxenx/ui";
import { useAdmin } from "../state/AdminState.js";

export function AdminSettingsPage() {
  const { backendUrl, backendHealth, updateBackendUrl, checkHealth, admin } = useAdmin();
  const toast = useToast();
  const [url, setUrl] = useState(backendUrl);
  const [saving, setSaving] = useState(false);

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
