/**
 * Paramètres — tous les contrôles affichés sont fonctionnels :
 * lancement, mises à jour, animations, notifications, téléchargements,
 * confidentialité, backend, version, déconnexion.
 */
import { useState } from "react";
import { FolderOpen, Rocket, Server, Sparkles, Bell, ShieldCheck, Info, LogOut } from "lucide-react";
import {
  LxButton,
  LxBadge,
  LxPanel,
  LxSectionHeader,
  LxSettingRow,
  LxToggle,
  LxConfirmModal,
  useToast,
} from "@luxenx/ui";
import { useApp } from "../state/AppState.js";

export function SettingsPage() {
  const { localSettings, updateLocalSettings, updateStatus, appInfo, logout, data } = useApp();
  const toast = useToast();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [autostartBusy, setAutostartBusy] = useState(false);

  if (!localSettings) return null;
  const s = localSettings;

  async function set(patch: Parameters<typeof updateLocalSettings>[0]) {
    await updateLocalSettings(patch);
  }

  async function toggleAutostart(next: boolean) {
    setAutostartBusy(true);
    const ok = await window.luxenx.autostart.set(next);
    if (ok) {
      await set({ autostartEnabled: next });
      toast.push(
        next ? "success" : "info",
        next
          ? "LuxenX vérifiera les mises à jour au démarrage de Windows, sans ouvrir de fenêtre."
          : "Démarrage automatique désactivé.",
      );
    } else {
      toast.push("error", "Windows a refusé la modification du démarrage automatique.");
    }
    setAutostartBusy(false);
  }

  async function chooseFolder() {
    const chosen = await window.luxenx.dialog.chooseFolder();
    if (chosen) {
      await set({ downloadFolder: chosen });
      toast.push("success", "Dossier de téléchargement mis à jour.");
    }
  }

  return (
    <div className="lx-page">
      <LxSectionHeader title="Paramètres" subtitle="Chaque option ci-dessous est réellement appliquée." />

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
        {/* ---- Lancement ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Rocket size={17} style={{ color: "var(--lx-violet-soft)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Lancement</h3>
          </div>
          <LxSettingRow
            title="Démarrer avec Windows (vérification des mises à jour)"
            description="LuxenX se lance silencieusement à l'ouverture de session : aucune fenêtre, aucune introduction — uniquement la vérification des mises à jour. Visible et désactivable dans Paramètres Windows > Applications > Démarrage."
          >
            <LxToggle checked={s.autostartEnabled} disabled={autostartBusy} onChange={(v) => void toggleAutostart(v)} label="Démarrage automatique" />
          </LxSettingRow>
          <LxSettingRow
            title="Afficher l'introduction animée"
            description="Désactivez pour arriver directement à l'écran de connexion."
          >
            <LxToggle checked={s.introEnabled} onChange={(v) => void set({ introEnabled: v })} label="Introduction" />
          </LxSettingRow>
        </LxPanel>

        {/* ---- Mises à jour ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Info size={17} style={{ color: "var(--lx-cyan)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Mises à jour</h3>
          </div>
          <LxSettingRow
            title="Vérifier automatiquement au démarrage"
            description="Recherche discrète de nouvelles versions via GitHub Releases (source officielle configurée à la compilation)."
          >
            <LxToggle checked={s.autoCheckUpdates} onChange={(v) => void set({ autoCheckUpdates: v })} label="Vérification automatique" />
          </LxSettingRow>
          <LxSettingRow
            title="Télécharger automatiquement les mises à jour"
            description="L'installation se termine au prochain redémarrage de LuxenX. L'intégrité des fichiers est vérifiée par electron-updater."
          >
            <LxToggle checked={s.autoDownloadUpdates} onChange={(v) => void set({ autoDownloadUpdates: v })} label="Téléchargement automatique" />
          </LxSettingRow>
          <LxSettingRow title="État actuel" description={`Statut : ${updateStatus.state}${updateStatus.version ? ` · version ${updateStatus.version}` : ""}`}>
            <LxButton variant="secondary" size="sm" onClick={() => void window.luxenx.updater.check()}>
              Vérifier maintenant
            </LxButton>
          </LxSettingRow>
        </LxPanel>

        {/* ---- Apparence / animations ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={17} style={{ color: "var(--lx-pink)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Apparence et animations</h3>
          </div>
          <LxSettingRow
            title="Animations"
            description="Transitions, halos et microanimations. À désactiver sur les ordinateurs moins puissants."
          >
            <LxToggle checked={s.animationsEnabled} onChange={(v) => void set({ animationsEnabled: v })} label="Animations" />
          </LxSettingRow>
          <LxSettingRow
            title="Réduire les mouvements"
            description="Supprime les déplacements et effets de ressort, conserve les fondus. Suit aussi le réglage Windows « réduire les animations »."
          >
            <LxToggle checked={s.reduceMotion} onChange={(v) => void set({ reduceMotion: v })} label="Réduire les mouvements" />
          </LxSettingRow>
          <LxSettingRow title="Notifications" description="Messages discrets en bas à droite (résultats d'opérations, mises à jour).">
            <LxToggle checked={s.notificationsEnabled} onChange={(v) => void set({ notificationsEnabled: v })} label="Notifications" />
          </LxSettingRow>
        </LxPanel>

        {/* ---- Téléchargements ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <FolderOpen size={17} style={{ color: "var(--lx-success)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Téléchargements</h3>
          </div>
          <LxSettingRow
            title="Dossier de destination"
            description={s.downloadFolder || "Dossier Musique\\LuxenX par défaut."}
          >
            <LxButton variant="secondary" size="sm" onClick={() => void chooseFolder()}>
              Modifier le dossier
            </LxButton>
          </LxSettingRow>
        </LxPanel>

        {/* ---- Serveur (adresse intégrée à l'installation, non modifiable) ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <Server size={17} style={{ color: "var(--lx-blue-soft)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Serveur LuxenX</h3>
          </div>
          <LxSettingRow
            title="Adresse du backend"
            description="Fournie avec l'installation par votre organisation : elle ne peut pas être modifiée depuis l'application, afin de garantir que LuxenX parle toujours au serveur officiel."
          >
            <code className="lx-small" style={{ color: "var(--lx-text-secondary)" }}>{s.backendUrl}</code>
          </LxSettingRow>
          <LxSettingRow title="État de la synchronisation" description={data.fetchedAt ? `Dernière synchronisation à ${new Date(data.fetchedAt).toLocaleTimeString("fr-FR")}` : "En attente de synchronisation."}>
            <LxBadge tone={data.error ? "warning" : "success"}>{data.error ? "dégradée" : "active"}</LxBadge>
          </LxSettingRow>
        </LxPanel>

        {/* ---- Confidentialité ---- */}
        <LxPanel depth="glass">
          <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={17} style={{ color: "var(--lx-lavender)" }} />
            <h3 className="lx-title-md" style={{ fontSize: 16 }}>Confidentialité</h3>
          </div>
          <div style={{ padding: "6px 20px 20px", color: "var(--lx-text-secondary)", fontSize: 14, lineHeight: 1.65 }}>
            <p>
              LuxenX ne collecte que les données nécessaires au fonctionnement du compte (adresse
              électronique, nom d'utilisateur, dates de session). Aucun fichier personnel, aucun
              presse-papiers n'est lu ou transmis. L'accord complet présenté à l'installation est
              consultable dans <em>docs/PRIVACY-DATA.md</em> du projet.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <LxButton variant="secondary" size="sm" onClick={() => void window.luxenx.shell.openExternal("https://github.com/")}>
                En savoir plus sur les données
              </LxButton>
              <LxButton variant="ghost" size="sm" onClick={() => void window.luxenx.tokens.clear().then(() => toast.push("info", "Jetons locaux effacés."))}>
                Effacer les jetons locaux
              </LxButton>
            </div>
            <div className="lx-small lx-muted" style={{ marginTop: 12 }}>
              Stockage des jetons sur cet ordinateur :{" "}
              {appInfo?.storageEncrypted ? "chiffré via Windows DPAPI (safeStorage)." : "non chiffré — mode développement uniquement."}
            </div>
          </div>
        </LxPanel>

        {/* ---- À propos + déconnexion ---- */}
        <LxPanel depth="flat" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <Bell size={18} style={{ color: "var(--lx-text-muted)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 650 }}>LuxenX {appInfo?.version ?? ""}</div>
            <div className="lx-small lx-muted">
              Version installée · Electron {appInfo?.packaged ? "packagé" : "développement"} ·{" "}
              {updateStatus.state === "downloaded" ? `mise à jour ${updateStatus.version} prête` : "à jour"}
            </div>
          </div>
          <LxButton variant="danger" icon={<LogOut size={15} />} onClick={() => setLogoutOpen(true)}>
            Se déconnecter
          </LxButton>
        </LxPanel>
      </div>

      <LxConfirmModal
        open={logoutOpen}
        title="Se déconnecter de LuxenX ?"
        message="Votre session sera fermée sur cet appareil. Vous pourrez vous reconnecter à tout moment."
        confirmLabel="Se déconnecter"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void logout()}
      />
    </div>
  );
}
