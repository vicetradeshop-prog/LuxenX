/**
 * Bandeau / pastille de mise à jour automatique.
 * Discret : n'interrompt jamais l'utilisateur en pleine tâche.
 */
import { Download, RefreshCw, CheckCircle2, AlertTriangle, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { LxButton, LxProgress } from "@luxenx/ui";
import { useApp } from "../state/AppState.js";

export function UpdateBanner({ compact = false }: { compact?: boolean }) {
  const { updateStatus } = useApp();
  const s = updateStatus.state;

  if (s === "idle" || s === "dev" || s === "checking" || s === "not-available") {
    if (compact) return null;
    if (s === "checking") {
      return (
        <div className="lx-update-banner">
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }} style={{ display: "flex" }}>
            <RefreshCw size={18} />
          </motion.span>
          <span>Recherche de mises à jour…</span>
        </div>
      );
    }
    return null;
  }

  if (compact) {
    return <span className="lx-nav-update-dot" title="Mise à jour disponible" style={{ marginLeft: 0 }} />;
  }

  if (s === "downloading") {
    return (
      <div className="lx-update-banner">
        <Download size={18} style={{ color: "var(--lx-cyan)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            Téléchargement de la version {updateStatus.version ?? ""}…
          </div>
          <div style={{ marginTop: 6 }}>
            <LxProgress value={updateStatus.progress ?? null} />
          </div>
        </div>
      </div>
    );
  }

  if (s === "downloaded") {
    return (
      <div className="lx-update-banner" style={{ borderColor: "rgba(52,211,153,0.4)" }}>
        <CheckCircle2 size={20} style={{ color: "var(--lx-success)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 14.5 }}>
            La version {updateStatus.version} est prête
          </div>
          <div className="lx-small lx-muted">Elle sera installée au redémarrage de LuxenX.</div>
        </div>
        <LxButton size="sm" onClick={() => void window.luxenx.updater.install()} icon={<Rocket size={15} />}>
          Redémarrer maintenant
        </LxButton>
      </div>
    );
  }

  if (s === "available") {
    return (
      <div className="lx-update-banner">
        <Download size={18} style={{ color: "var(--lx-cyan)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 650, fontSize: 14.5 }}>
            Nouvelle version disponible : {updateStatus.version}
          </div>
        </div>
        <LxButton size="sm" variant="secondary" onClick={() => void window.luxenx.updater.download()}>
          Télécharger
        </LxButton>
      </div>
    );
  }

  if (s === "error") {
    return (
      <div className="lx-update-banner" style={{ borderColor: "rgba(251,191,36,0.35)" }}>
        <AlertTriangle size={18} style={{ color: "var(--lx-warning)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Vérification des mises à jour impossible</div>
          <div className="lx-small lx-muted">{updateStatus.error ?? "Erreur réseau."} LuxenX réessaiera plus tard.</div>
        </div>
        <LxButton size="sm" variant="ghost" onClick={() => void window.luxenx.updater.check()}>
          Réessayer
        </LxButton>
      </div>
    );
  }

  return null;
}
