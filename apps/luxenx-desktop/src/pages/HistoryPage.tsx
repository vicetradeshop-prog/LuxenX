/**
 * Historique des opérations : téléchargements Script musique.
 * Données réelles (aucun historique fictif), états vides soignés.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Ban, Loader2, FolderOpen, Trash2, FileAudio } from "lucide-react";
import type { MusicTask } from "../../electron/bridge-types.js";
import { EmptyBoxIllustration, LxButton, LxEmptyState, LxSectionHeader, LxBadge, LxProgress, useToast } from "@luxenx/ui";
import { navigate } from "../lib/nav.js";

const STATE_META: Record<MusicTask["state"], { label: string; tone: "success" | "danger" | "warning" | "neutral" | "blue" | "violet" }> = {
  queued: { label: "En attente", tone: "neutral" },
  analyzing: { label: "Analyse…", tone: "blue" },
  downloading: { label: "Téléchargement…", tone: "violet" },
  converting: { label: "Conversion…", tone: "blue" },
  done: { label: "Terminé", tone: "success" },
  error: { label: "Échec", tone: "danger" },
  cancelled: { label: "Annulé", tone: "warning" },
};

export function HistoryPage() {
  const [tasks, setTasks] = useState<MusicTask[] | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setTasks(await window.luxenx.music.list());
  }, []);

  useEffect(() => {
    void refresh();
    const off = window.luxenx.music.onTask(() => void refresh());
    return off;
  }, [refresh]);

  async function clearHistory() {
    setTasks(await window.luxenx.music.clearHistory());
    toast.push("info", "Historique des opérations terminées effacé.");
  }

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Historique des opérations"
        subtitle="Vos téléchargements Script musique, réussis ou interrompus."
        action={
          tasks && tasks.some((t) => ["done", "error", "cancelled"].includes(t.state)) ? (
            <LxButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void clearHistory()}>
              Effacer l'historique
            </LxButton>
          ) : undefined
        }
      />

      {tasks === null && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--lx-text-muted)" }}>
          <Loader2 className="lx-spinner" style={{ margin: "0 auto" }} />
        </div>
      )}

      {tasks !== null && tasks.length === 0 && (
        <LxEmptyState
          illustration={<EmptyBoxIllustration />}
          title="Aucune opération pour l'instant"
          description="Vos téléchargements Script musique apparaîtront ici avec leur état et leur emplacement."
          action={
            <LxButton size="sm" onClick={() => navigate({ name: "music" })} icon={<FileAudio size={15} />}>
              Ouvrir Script musique
            </LxButton>
          }
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(tasks ?? []).map((t, i) => {
          const meta = STATE_META[t.state];
          return (
            <motion.div
              key={t.id}
              className="lx-glass-flat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
              style={{ padding: "16px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flexShrink: 0 }}>
                  {t.state === "done" && <CheckCircle2 size={22} style={{ color: "var(--lx-success)" }} />}
                  {t.state === "error" && <XCircle size={22} style={{ color: "var(--lx-danger)" }} />}
                  {t.state === "cancelled" && <Ban size={22} style={{ color: "var(--lx-warning)" }} />}
                  {["queued", "analyzing", "downloading", "converting"].includes(t.state) && (
                    <Loader2 size={22} style={{ color: "var(--lx-violet-soft)", animation: "lx-spin 1s linear infinite" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title ?? t.url}
                  </div>
                  <div className="lx-small lx-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {new Date(t.createdAt).toLocaleString("fr-FR")} · source : {t.source}
                    {t.error ? ` · ${t.error}` : ""}
                  </div>
                  {["downloading", "converting", "analyzing"].includes(t.state) && (
                    <div style={{ marginTop: 8 }}>
                      <LxProgress value={t.progress} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <LxBadge tone={meta.tone}>{meta.label}</LxBadge>
                  {t.state === "done" && t.outputPath && (
                    <LxButton
                      variant="ghost"
                      size="sm"
                      icon={<FolderOpen size={14} />}
                      onClick={() => void window.luxenx.shell.showItemInFolder(t.outputPath!)}
                    >
                      Dossier
                    </LxButton>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
