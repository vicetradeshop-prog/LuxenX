/**
 * Script musique — fonctionnalité complète.
 *
 * Flux voulu : je colle un lien (Spotify, SoundCloud, YouTube, fichier
 * direct…) → j'analyse → au premier téléchargement l'app me demande DANS
 * QUEL DOSSIER enregistrer (boîte Windows) → barre de progression animée
 * → écran de réussite → c'est terminé.
 *
 * spotDL est invoqué via python -m spotdl (arguments séparés, jamais de
 * shell). FFmpeg est installé/localisé automatiquement.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderOpen,
  Download,
  Search,
  XCircle,
  ShieldCheck,
  PackageOpen,
  Info,
  BookOpen,
  Sparkles,
} from "lucide-react";
import type { MusicAnalysis, MusicTask, DepsStatus } from "../../electron/bridge-types.js";
import {
  LxButton,
  LxInput,
  LxPanel,
  LxProgress,
  LxBadge,
  LxSectionHeader,
  LxToggle,
  Illustration,
  SuccessIllustration,
  useToast,
} from "@luxenx/ui";
import { navigate } from "../lib/nav.js";
import { useApp } from "../state/AppState.js";

type Phase = "idle" | "analyzing" | "analyzed" | "error";

const SPRING = { type: "spring", stiffness: 320, damping: 26 } as const;

export function MusicPage() {
  const { data, localSettings, updateLocalSettings } = useApp();
  const toast = useToast();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [folder, setFolder] = useState<string>("");
  const [deps, setDeps] = useState<DepsStatus | null>(null);
  const [depsInstalling, setDepsInstalling] = useState(false);
  const [depsLog, setDepsLog] = useState<string[]>([]);
  const [tasks, setTasks] = useState<MusicTask[]>([]);
  const [success, setSuccess] = useState<MusicTask | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const knownStates = useRef<Map<string, MusicTask["state"]>>(new Map());

  const refreshTasks = useCallback(async () => {
    setTasks(await window.luxenx.music.list());
  }, []);

  useEffect(() => {
    void (async () => {
      setFolder(await window.luxenx.music.getFolder());
      setDeps(await window.luxenx.music.deps());
      await refreshTasks();
    })();
    const offTask = window.luxenx.music.onTask(() => void refreshTasks());
    const offLog = window.luxenx.music.onDepsLog((line) => setDepsLog((l) => [...l.slice(-60), line]));
    return () => {
      offTask();
      offLog();
    };
  }, [refreshTasks]);

  /* Détection des tâches qui viennent de passer à « done » : écran de réussite. */
  useEffect(() => {
    for (const t of tasks) {
      const prev = knownStates.current.get(t.id);
      knownStates.current.set(t.id, t.state);
      if (prev && prev !== "done" && t.state === "done") {
        setSuccess(t);
      }
    }
  }, [tasks]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [depsLog]);

  async function onAnalyze() {
    setAnalyzeError(null);
    setAnalysis(null);
    if (!url.trim()) {
      setAnalyzeError("Collez d'abord un lien.");
      return;
    }
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocole");
    } catch {
      setAnalyzeError("Ce lien n'est pas une URL valide (http:// ou https:// attendu).");
      setPhase("error");
      return;
    }
    setPhase("analyzing");
    try {
      const res = await window.luxenx.music.analyze(url.trim());
      setAnalysis(res);
      setPhase(res.available ? "analyzed" : "error");
      if (!res.available && res.message) setAnalyzeError(res.message);
      setDeps(await window.luxenx.music.deps());
    } catch (err) {
      setPhase("error");
      setAnalyzeError(err instanceof Error ? err.message : "Analyse impossible.");
    }
  }

  /** Premier téléchargement : choix du dossier via la boîte Windows. */
  async function ensureFolder(): Promise<string | null> {
    if (localSettings?.downloadFolderChosen && folder) return folder;
    const chosen = await window.luxenx.dialog.chooseFolder();
    if (!chosen) {
      toast.push("info", "Téléchargement annulé : aucun dossier choisi.");
      return null;
    }
    setFolder(chosen);
    await updateLocalSettings({ downloadFolder: chosen, downloadFolderChosen: true });
    return chosen;
  }

  async function onDownload() {
    if (!analysis?.available) return;
    if (!rightsConfirmed) {
      toast.push("warning", "Confirmez d'abord que vous disposez des droits sur ce contenu.");
      return;
    }
    const target = await ensureFolder();
    if (!target) return;

    const task = await window.luxenx.music.start(analysis.url, true);
    await refreshTasks();
    if (task.state === "error" && task.error) {
      toast.push("error", task.error);
    } else {
      toast.push("success", "Téléchargement lancé — suivez la progression ci-dessous.");
    }
  }

  async function onChooseFolder() {
    const chosen = await window.luxenx.dialog.chooseFolder();
    if (chosen) {
      setFolder(chosen);
      await updateLocalSettings({ downloadFolder: chosen, downloadFolderChosen: true });
      toast.push("success", "Dossier de destination mis à jour.");
    }
  }

  async function onInstallDeps() {
    setDepsInstalling(true);
    setDepsLog([]);
    const res = await window.luxenx.music.installDeps();
    setDeps(res.deps);
    setDepsInstalling(false);
    toast.push(res.ok ? "success" : "error", res.message);
  }

  const musicFaq = data.help.faq.filter((f) =>
    ["faq-fonctionnement", "faq-sources", "faq-lien-invalide", "faq-fichiers", "faq-droits"].includes(f.id),
  );

  return (
    <div className="lx-page">
      {/* ---- Héro ---- */}
      <motion.div
        className="lx-glass lx-music-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <LxBadge tone="violet" glow>DISPONIBLE · spotDL</LxBadge>
          <h1 className="lx-title-xl" style={{ marginTop: 12 }}>
            Script <span className="lx-gradient-text">musique</span>
          </h1>
          <p className="lx-subtitle" style={{ maxWidth: 520 }}>
            Collez un lien Spotify, Deezer, SoundCloud, YouTube ou un fichier direct :
            LuxenX lit les informations réellement disponibles, télécharge avec une
            progression en temps réel et enregistre dans le dossier de votre choix.
          </p>
        </div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Illustration id="music" size={150} />
        </motion.div>
      </motion.div>

      {/* ---- Saisie d'URL ---- */}
      <LxPanel depth="deep" style={{ padding: 26, marginBottom: 26 }}>
        <div className="lx-url-row">
          <div style={{ flex: 1 }}>
            <LxInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/…  ·  fichier .mp3  ·  soundcloud.com/…"
              aria-label="URL à analyser"
              error={phase === "error" && !analysis ? analyzeError : null}
              onKeyDown={(e) => e.key === "Enter" && void onAnalyze()}
            />
          </div>
          <LxButton size="lg" onClick={() => void onAnalyze()} loading={phase === "analyzing"} icon={<Search size={17} />}>
            Analyser
          </LxButton>
        </div>
        <div className="lx-small lx-muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Première analyse : vérification du moteur spotDL/FFmpeg, quelques secondes.
          Téléchargement d'un titre Spotify/YouTube : 10 à 40 s selon la source
          (recherche audio + encodage) — la progression s'affiche en temps réel.
        </div>

        <AnimatePresence>
          {analysis && phase === "analyzed" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="lx-glass-flat" style={{ marginTop: 18, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <motion.div
                    className="lx-feature-card-illustration"
                    style={{ width: 58, height: 58, borderRadius: 18 }}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING}
                  >
                    <Illustration id="music" size={40} />
                  </motion.div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 650, fontSize: 15.5 }}>
                      {analysis.title || "Titre et artiste lus pendant le téléchargement"}
                    </div>
                    <div className="lx-small lx-muted">
                      Source : {analysis.source}
                      {analysis.artist ? ` · Artiste : ${analysis.artist}` : ""}
                      {analysis.durationSeconds ? ` · Durée : ${Math.round(analysis.durationSeconds)} s` : ""}
                      {analysis.trackCount ? ` · ${analysis.trackCount} pistes` : ""}
                    </div>
                    {analysis.message && (
                      <div className="lx-small" style={{ color: "var(--lx-text-secondary)", marginTop: 4 }}>
                        {analysis.message}
                      </div>
                    )}
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    marginTop: 16,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(52,211,153,0.06)",
                    border: "1px solid rgba(52,211,153,0.25)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ marginTop: 1 }}>
                    <LxToggle checked={rightsConfirmed} onChange={setRightsConfirmed} label="Confirmation des droits" />
                  </span>
                  <span className="lx-small" style={{ color: "var(--lx-text-secondary)", lineHeight: 1.55 }}>
                    <ShieldCheck size={14} style={{ verticalAlign: -2, color: "var(--lx-success)" }} /> Je confirme
                    disposer des droits sur ce contenu, ou utiliser un contenu libre / sous licence ouverte.
                  </span>
                </label>

                <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <LxButton size="lg" onClick={() => void onDownload()} disabled={!rightsConfirmed} icon={<Download size={17} />}>
                      Télécharger
                    </LxButton>
                  </motion.div>
                  <LxButton variant="ghost" size="sm" onClick={() => void onChooseFolder()} icon={<FolderOpen size={14} />}>
                    Dossier : <strong style={{ marginLeft: 4 }}>{folder || "choisir…"}</strong>
                  </LxButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "error" && analyzeError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="lx-glass-flat"
            role="alert"
            style={{ marginTop: 18, padding: "14px 18px", borderColor: "rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)" }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <XCircle size={18} style={{ color: "var(--lx-danger)", flexShrink: 0, marginTop: 2 }} />
              <div className="lx-small" style={{ color: "#fca5a5", lineHeight: 1.6 }}>
                {analyzeError}
              </div>
            </div>
          </motion.div>
        )}
      </LxPanel>

      {/* ---- Téléchargements en cours ---- */}
      <LxSectionHeader title="Téléchargements" subtitle="Progression en temps réel, annulation à tout moment." />
      <LxPanel depth="flat" style={{ padding: 8, marginBottom: 30 }}>
        {tasks.length === 0 ? (
          <div className="lx-empty-state" style={{ padding: "30px 20px" }}>
            <div className="lx-muted lx-small">Aucun téléchargement en cours — analysez un lien pour démarrer.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence initial={false}>
              {tasks.slice(0, 8).map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={SPRING}
                  className="lx-task-row"
                  style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.title ?? t.url}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {["downloading", "converting", "analyzing"].includes(t.state) ? (
                        <LxProgress value={t.progress} />
                      ) : (
                        <LxBadge
                          tone={
                            t.state === "done" ? "success" : t.state === "error" ? "danger" : t.state === "cancelled" ? "warning" : "neutral"
                          }
                        >
                          {t.state === "done"
                            ? "Réussi"
                            : t.state === "error"
                              ? "Échec"
                              : t.state === "cancelled"
                                ? "Annulé"
                                : t.state === "queued"
                                  ? "En attente"
                                  : t.state}
                        </LxBadge>
                      )}
                    </div>
                    {t.error && (
                      <div className="lx-small" style={{ color: "var(--lx-danger)", marginTop: 6 }}>
                        {t.error}
                      </div>
                    )}
                  </div>
                  <div className="lx-task-actions">
                    {["queued", "analyzing", "downloading", "converting"].includes(t.state) && (
                      <LxButton variant="secondary" size="sm" onClick={() => void window.luxenx.music.cancel(t.id).then(refreshTasks)}>
                        Annuler
                      </LxButton>
                    )}
                    {t.state === "done" && t.outputPath && (
                      <LxButton variant="ghost" size="sm" icon={<FolderOpen size={14} />} onClick={() => void window.luxenx.shell.showItemInFolder(t.outputPath!)}>
                        Dossier
                      </LxButton>
                    )}
                    {t.state === "error" && (
                      <LxButton variant="secondary" size="sm" onClick={() => void window.luxenx.music.start(t.url, true).then(refreshTasks)}>
                        Réessayer
                      </LxButton>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </LxPanel>

      {/* ---- Dépendances ---- */}
      <LxPanel depth="glass" style={{ padding: 24, marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <PackageOpen size={20} style={{ color: "var(--lx-lavender)" }} />
          <h3 className="lx-title-md" style={{ fontSize: 17 }}>Moteur de téléchargement</h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <LxBadge tone={deps?.python.installed ? "success" : "neutral"}>Python {deps?.python.version ?? "—"}</LxBadge>
            <LxBadge tone={deps?.spotdl.installed ? "success" : "neutral"}>spotDL {deps?.spotdl.version ?? "—"}</LxBadge>
            <LxBadge tone={deps?.ffmpeg.installed ? "success" : "neutral"}>FFmpeg {deps?.ffmpeg.installed ? "OK" : "—"}</LxBadge>
          </div>
        </div>
        <p className="lx-small lx-muted" style={{ marginBottom: 14, maxWidth: 760, lineHeight: 1.6 }}>
          Les fichiers directs fonctionnent sans dépendance. Pour Spotify, Deezer, SoundCloud ou
          YouTube, LuxenX utilise spotDL (installé depuis PyPI, source officielle) et FFmpeg
          (installé et localisé automatiquement) — uniquement sur votre action explicite.
        </p>
        {!deps?.ready && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <LxButton variant="secondary" size="sm" loading={depsInstalling} onClick={() => void onInstallDeps()}>
              Installer les dépendances
            </LxButton>
            {deps?.hint && <span className="lx-small lx-muted">{deps.hint}</span>}
          </div>
        )}
        {depsInstalling && depsLog.length > 0 && (
          <div
            ref={logRef}
            style={{
              marginTop: 14,
              maxHeight: 140,
              overflowY: "auto",
              background: "rgba(0,0,0,0.4)",
              borderRadius: 12,
              padding: "10px 14px",
              fontFamily: "Consolas, monospace",
              fontSize: 12,
              color: "var(--lx-text-muted)",
              whiteSpace: "pre-wrap",
            }}
          >
            {depsLog.join("\n")}
          </div>
        )}
      </LxPanel>

      {/* ---- FAQ ---- */}
      <LxSectionHeader
        title="Questions fréquentes"
        subtitle="Sources prises en charge, dossiers, erreurs et droits."
        action={
          <LxButton variant="ghost" size="sm" icon={<BookOpen size={14} />} onClick={() => navigate({ name: "help" })}>
            Centre d'aide complet
          </LxButton>
        }
      />
      <LxPanel depth="flat" style={{ padding: "6px 22px", marginBottom: 30 }}>
        {musicFaq.length === 0 && (
          <div className="lx-small lx-muted" style={{ padding: "18px 0", display: "flex", gap: 8, alignItems: "center" }}>
            <Info size={14} /> La FAQ est chargée depuis le serveur LuxenX — connexion en attente.
          </div>
        )}
        {musicFaq.map((f) => (
          <details key={f.id} className="lx-faq-item">
            <summary className="lx-faq-question" style={{ cursor: "pointer", listStyle: "none" }}>
              {f.question}
              <span style={{ color: "var(--lx-violet-soft)" }}>＋</span>
            </summary>
            <div className="lx-faq-answer">{f.answer}</div>
          </details>
        ))}
      </LxPanel>

      {/* ---- Guides ---- */}
      <LxSectionHeader title="Guides de transfert" subtitle="Vers vos lecteurs MP3 et MP4, étape par étape." />
      <div className="lx-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {data.help.guides
          .filter((g) => ["guide-mp3", "guide-mp4", "guide-usb"].includes(g.id))
          .map((g) => (
            <motion.button
              key={g.id}
              className="lx-glass lx-feature-card"
              style={{ minHeight: 190, textAlign: "left", fontFamily: "inherit", color: "inherit" }}
              whileHover={{ y: -4 }}
              onClick={() => navigate({ name: "help" })}
            >
              <div className="lx-feature-card-illustration" style={{ width: 64, height: 64, borderRadius: 20 }}>
                <Illustration id={g.illustration} size={46} />
              </div>
              <div style={{ marginTop: "auto" }}>
                <div className="lx-title-md" style={{ fontSize: 16 }}>{g.title}</div>
                <div className="lx-small lx-muted" style={{ marginTop: 4 }}>{g.steps.length} étapes · {g.category}</div>
              </div>
            </motion.button>
          ))}
      </div>

      {/* ---- Écran de réussite (effet Apple : spring + halo) ---- */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="lx-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(4,4,8,0.6)" }}
          >
            <motion.div
              className="lx-glass-deep"
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={SPRING}
              style={{ padding: "38px 42px", textAlign: "center", maxWidth: 460, position: "relative", overflow: "hidden" }}
            >
              <motion.div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -60,
                  background: "radial-gradient(circle at 50% 40%, rgba(52,211,153,0.25), transparent 60%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
              <motion.div
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...SPRING, delay: 0.08 }}
                style={{ position: "relative", display: "flex", justifyContent: "center" }}
              >
                <SuccessIllustration size={120} />
              </motion.div>
              <motion.h3
                className="lx-title-lg"
                style={{ marginTop: 14, position: "relative" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                Terminé !
              </motion.h3>
              <motion.p
                className="lx-subtitle"
                style={{ fontSize: 14, position: "relative" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 }}
              >
                {success.title ?? "Votre fichier"} est enregistré dans :
                <br />
                <strong style={{ color: "var(--lx-text)" }}>{folder}</strong>
              </motion.p>
              <motion.div
                style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, position: "relative" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
              >
                <LxButton
                  icon={<FolderOpen size={15} />}
                  onClick={() => {
                    if (success.outputPath) void window.luxenx.shell.showItemInFolder(success.outputPath);
                    setSuccess(null);
                  }}
                >
                  Ouvrir le dossier
                </LxButton>
                <LxButton variant="ghost" icon={<Sparkles size={15} />} onClick={() => setSuccess(null)}>
                  Continuer
                </LxButton>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
