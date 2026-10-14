/**
 * Service "Script musique" — processus principal.
 *
 * Principes :
 * - Les tâches longues s'exécutent HORS du renderer : l'UI reste fluide.
 * - Aucune commande construite depuis une URL brute : processus lancés
 *   avec des arguments séparés (spawn sans shell). spotDL est invoqué via
 *   `python -m spotdl` (fonctionne même si le script n'est pas dans le PATH).
 * - FFmpeg : détecté dans le PATH, sinon installé via ffmpeg-downloader
 *   (outil PyPI officiel) et localisé par analyse de sa sortie ; le chemin
 *   est mémorisé et passé à spotDL (--ffmpeg).
 * - Droits : téléchargement démarré uniquement après confirmation
 *   explicite de l'utilisateur. Apple Music = modes officiels expliqués.
 * - Progression réelle (content-length) pour les fichiers directs,
 *   analysée depuis la sortie spotDL sinon ; indéterminée si inconnue.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { statfs } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { app } from "electron";
import { logger } from "./logger.js";
import { readSettings, writeSettings } from "./store.js";
import {
  detectSource,
  isBlockedSource,
  isDirectSource,
  safeFileNameFromUrl,
  sourceMessage,
  spotdlModuleArgs,
  type MusicSource,
} from "./music-sources.js";

export type MusicTaskState =
  | "queued"
  | "analyzing"
  | "downloading"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface MusicTask {
  id: string;
  url: string;
  source: string;
  kind: "direct" | "spotdl";
  state: MusicTaskState;
  progress: number | null;
  title: string | null;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface MusicAnalysis {
  url: string;
  source: string;
  title: string;
  artist: string | null;
  durationSeconds: number | null;
  trackCount: number | null;
  available: boolean;
  message: string | null;
}

export interface DepsStatus {
  spotdl: { installed: boolean; version: string | null };
  ffmpeg: { installed: boolean; version: string | null; path: string | null };
  python: {
    installed: boolean;
    version: string | null;
    cmd?: string | null;
    baseArgs?: string[];
  };
  ready: boolean;
  hint: string;
}

type Listener = (task: MusicTask) => void;

export class MusicService {
  private tasks = new Map<string, MusicTask>();
  private children = new Map<string, ChildProcessWithoutNullStreams>();
  private aborts = new Map<string, AbortController>();
  private listeners = new Set<Listener>();
  private queue: string[] = [];
  private running = false;
  private depsCache: DepsStatus | null = null;
  private pythonRuntime: { cmd: string; baseArgs: string[]; version: string | null } | null | undefined = undefined;

  onTask(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(task: MusicTask): void {
    for (const l of this.listeners) {
      try {
        l({ ...task });
      } catch {
        // un listener défaillant ne casse pas le service
      }
    }
  }

  private update(id: string, patch: Partial<MusicTask>): MusicTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    Object.assign(task, patch);
    this.emit(task);
    return task;
  }

  list(): MusicTask[] {
    return [...this.tasks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getDownloadFolder(): string {
    const s = readSettings();
    if (s.downloadFolder && existsSync(s.downloadFolder)) return s.downloadFolder;
    const fallback = path.join(app.getPath("music"), "LuxenX");
    if (s.downloadFolder !== fallback) writeSettings({ downloadFolder: fallback });
    return fallback;
  }

  /* ---------------- Analyse ---------------- */

  async analyze(rawUrl: string): Promise<MusicAnalysis> {
    const source: MusicSource = detectSource(rawUrl);
    const base = {
      url: rawUrl,
      source,
      title: "",
      artist: null,
      durationSeconds: null,
      trackCount: null,
      available: false,
      message: sourceMessage(source),
    } satisfies MusicAnalysis;

    if (isBlockedSource(source)) return base;

    if (isDirectSource(source)) {
      // Métadonnées RÉELLES via HEAD : on n'invente jamais rien.
      try {
        const res = await fetch(rawUrl, { method: "HEAD" });
        if (!res.ok) return { ...base, message: `Le serveur a répondu ${res.status} pour ce lien.` };
        const disposition = res.headers.get("content-disposition") ?? "";
        const match = /filename="?([^";]+)"?/i.exec(disposition);
        return {
          ...base,
          title: match?.[1] ?? safeFileNameFromUrl(rawUrl),
          available: true,
        };
      } catch {
        return { ...base, message: "Impossible de joindre ce lien (réseau ou serveur inaccessible)." };
      }
    }

    // Source spotDL : disponible si les dépendances sont prêtes.
    const deps = await this.checkDeps();
    if (!deps.ready) return { ...base, message: deps.hint };
    return { ...base, available: true };
  }

  /* ---------------- Dépendances ---------------- */

  private probe(cmd: string, args: string[], timeoutMs = 8_000): Promise<{ ok: boolean; out: string }> {
    return new Promise((resolve) => {
      try {
        const child = spawn(cmd, args, { shell: false, windowsHide: true });
        let out = "";
        const timer = setTimeout(() => {
          child.kill();
          resolve({ ok: false, out: "" });
        }, timeoutMs);
        child.stdout?.on("data", (d) => (out += String(d)));
        child.stderr?.on("data", (d) => (out += String(d)));
        child.on("error", () => {
          clearTimeout(timer);
          resolve({ ok: false, out: "" });
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ ok: code === 0, out: out.trim() });
        });
      } catch {
        resolve({ ok: false, out: "" });
      }
    });
  }

  private firstLineVersion(out: string): string | null {
    const m = /(\d+\.\d+[\w.+-]*)/.exec(out);
    return m?.[1] ?? null;
  }

  /**
   * Résout l'interpréteur Python utilisable : sur Windows, la commande
   * "python" peut être l'alias muet du Microsoft Store (qui ne répond
   * jamais) ; on replie alors sur le lanceur officiel "py -3".
   */
  private async resolvePython(): Promise<{ cmd: string; baseArgs: string[]; version: string | null } | null> {
    if (this.pythonRuntime !== undefined) return this.pythonRuntime;
    const candidates: [string, string[]][] =
      process.platform === "win32"
        ? [["python", []], ["py", ["-3"]]]
        : [["python3", []], ["python", []]];
    for (const [cmd, baseArgs] of candidates) {
      const r = await this.probe(cmd, [...baseArgs, "--version"]);
      if (r.ok) {
        this.pythonRuntime = { cmd, baseArgs, version: this.firstLineVersion(r.out) };
        return this.pythonRuntime;
      }
    }
    this.pythonRuntime = null;
    return null;
  }

  /** Chemin FFmpeg connu : PATH > réglage mémorisé. */
  private async resolveFfmpegPath(): Promise<string | null> {
    const inPath = await this.probe("ffmpeg", ["-version"]);
    if (inPath.ok) return "ffmpeg";
    const saved = readSettings().ffmpegPath;
    if (saved && existsSync(saved)) return saved;
    return null;
  }

  async checkDeps(force = false): Promise<DepsStatus> {
    if (this.depsCache && !force) return this.depsCache;

    const py = await this.resolvePython();
    const [spotdl] = await Promise.all([
      py ? this.probe(py.cmd, [...py.baseArgs, "-m", "spotdl", "--version"]) : Promise.resolve({ ok: false, out: "" }),
    ]);
    const ffmpegPath = await this.resolveFfmpegPath();
    const ffmpeg = ffmpegPath
      ? await this.probe(ffmpegPath === "ffmpeg" ? "ffmpeg" : ffmpegPath, ["-version"])
      : { ok: false, out: "" };

    const ready = !!py && spotdl.ok && ffmpeg.ok;
    let hint = "";
    if (!py) {
      hint = "Python 3 est requis. Installez-le depuis python.org (cochez « Add to PATH »), puis relancez l'installation des dépendances.";
    } else if (!spotdl.ok) {
      hint = "spotDL est absent. Cliquez sur « Installer les dépendances » : l'installation se fait dans l'application via PyPI (source officielle).";
    } else if (!ffmpeg.ok) {
      hint = "FFmpeg manque (indispensable à l'encodage). Cliquez sur « Installer les dépendances » : LuxenX l'installe automatiquement.";
    }

    this.depsCache = {
      spotdl: { installed: spotdl.ok, version: spotdl.ok ? this.firstLineVersion(spotdl.out) : null },
      ffmpeg: {
        installed: ffmpeg.ok,
        version: ffmpeg.ok ? this.firstLineVersion(ffmpeg.out) : null,
        path: ffmpegPath,
      },
      python: {
        installed: !!py,
        version: py?.version ?? null,
        cmd: py?.cmd ?? null,
        baseArgs: py?.baseArgs ?? [],
      },
      ready,
      hint,
    };
    return this.depsCache;
  }

  /**
   * Installation des dépendances, uniquement sur action explicite :
   *  1. pip install --user spotdl ffmpeg-downloader  (PyPI, source officielle)
   *     repli sans --user si l'environnement Python est un venv ;
   *  2. python -m ffmpeg_downloader install -y       (binaires FFmpeg)
   *     le chemin installé est lu dans la sortie puis mémorisé.
   * Aucun binaire inconnu n'est téléchargé ni exécuté silencieusement.
   */
  async installDeps(onLog: (line: string) => void): Promise<{ ok: boolean; message: string }> {
    this.pythonRuntime = undefined;
    const py = await this.resolvePython();
    if (!py) {
      return {
        ok: false,
        message: "Python 3 est introuvable. Installez-le depuis python.org en cochant « Add to PATH », puis relancez.",
      };
    }
    const pyLabel = py.baseArgs.length ? `${py.cmd} ${py.baseArgs.join(" ")}` : py.cmd;

    onLog(`Installation de spotDL et ffmpeg-downloader via pip (${pyLabel})…`);
    let pip = await this.runLogged(
      py.cmd,
      [...py.baseArgs, "-m", "pip", "install", "--user", "--upgrade", "spotdl", "ffmpeg-downloader"],
      onLog,
    );
    if (!pip.ok) {
      onLog("Échec avec --user (environnement virtuel ?). Nouvel essai sans --user…");
      pip = await this.runLogged(py.cmd, [...py.baseArgs, "-m", "pip", "install", "--upgrade", "spotdl", "ffmpeg-downloader"], onLog);
    }
    if (!pip.ok) {
      return { ok: false, message: `pip a échoué (code ${pip.code}). Dernières lignes : ${pip.tail.slice(-300)}` };
    }

    onLog("Téléchargement des binaires FFmpeg (ffmpeg-downloader, officiel)…");
    const ffdl = await this.runLogged(py.cmd, [...py.baseArgs, "-m", "ffmpeg_downloader", "install", "-y"], onLog);
    if (ffdl.ok) {
      const m = /in\s*\r?\n?\s*(\S+)\s*$/m.exec(ffdl.out);
      const ffmpegPath = m?.[1];
      if (ffmpegPath && existsSync(ffmpegPath)) {
        writeSettings({ ffmpegPath });
        onLog(`FFmpeg installé : ${ffmpegPath}`);
      }
    } else {
      onLog("Avertissement : installation FFmpeg incomplète, vérification…");
    }

    this.depsCache = null;
    const deps = await this.checkDeps(true);
    if (deps.ready) {
      return {
        ok: true,
        message: `Dépendances prêtes : spotDL ${deps.spotdl.version ?? ""} + FFmpeg ${deps.ffmpeg.version ?? ""}.`,
      };
    }
    return {
      ok: false,
      message: deps.hint || "Installation incomplète : relancez l'installation des dépendances.",
    };
  }

  private runLogged(
    cmd: string,
    args: string[],
    onLog: (line: string) => void,
  ): Promise<{ ok: boolean; code: number | null; out: string; tail: string }> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { shell: false, windowsHide: true }) as ChildProcessWithoutNullStreams;
      let out = "";
      child.stdout.on("data", (d) => {
        const s = String(d);
        out += s;
        onLog(s.trimEnd());
      });
      child.stderr.on("data", (d) => {
        const s = String(d);
        out += s;
        onLog(s.trimEnd());
      });
      child.on("error", (err) => {
        onLog(`Erreur de lancement : ${err.message}`);
        resolve({ ok: false, code: null, out, tail: out.slice(-2000) });
      });
      child.on("close", (code) => resolve({ ok: code === 0, code, out, tail: out.slice(-2000) }));
    });
  }

  /* ---------------- Téléchargements ---------------- */

  start(rawUrl: string, opts: { confirmedRights: boolean }): MusicTask {
    const source = detectSource(rawUrl);
    const task: MusicTask = {
      id: randomUUID(),
      url: rawUrl,
      source,
      kind: isDirectSource(source) ? "direct" : "spotdl",
      state: "queued",
      progress: null,
      title: null,
      outputPath: null,
      error: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    };

    if (!opts.confirmedRights) {
      task.state = "error";
      task.error = "Confirmez d'abord que vous disposez des droits sur ce contenu.";
      this.tasks.set(task.id, task);
      this.emit(task);
      return task;
    }
    if (isBlockedSource(source)) {
      task.state = "error";
      task.error = sourceMessage(source);
      this.tasks.set(task.id, task);
      this.emit(task);
      return task;
    }

    this.tasks.set(task.id, task);
    this.emit(task);
    this.queue.push(task.id);
    void this.processQueue();
    return task;
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || ["done", "error", "cancelled"].includes(task.state)) return false;
    this.aborts.get(id)?.abort();
    const child = this.children.get(id);
    if (child) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
    this.queue = this.queue.filter((q) => q !== id);
    this.update(id, { state: "cancelled", finishedAt: new Date().toISOString(), progress: null });
    return true;
  }

  private async processQueue(): Promise<void> {
    if (this.running) return;
    const id = this.queue.shift();
    if (!id) return;
    this.running = true;
    try {
      const task = this.tasks.get(id);
      if (task && task.state === "queued") {
        if (task.kind === "direct") await this.runDirect(task);
        else await this.runSpotdl(task);
      }
    } catch (err) {
      this.update(id, {
        state: "error",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date().toISOString(),
      });
    } finally {
      this.running = false;
      void this.processQueue();
    }
  }

  private async ensureDiskSpace(folder: string): Promise<string | null> {
    try {
      const st = await statfs(folder);
      const freeBytes = st.bavail * st.bsize;
      if (freeBytes < 200 * 1024 * 1024) {
        return `Espace disque insuffisant (${Math.round(freeBytes / 1048576)} Mo libres, 200 Mo requis).`;
      }
    } catch {
      return `Le dossier de destination « ${folder} » est inaccessible. Choisissez-en un autre.`;
    }
    return null;
  }

  /* ---- Fichier direct : progression réelle par content-length ---- */

  private async runDirect(task: MusicTask): Promise<void> {
    const folder = this.getDownloadFolder();
    const diskError = await this.ensureDiskSpace(folder);
    if (diskError) {
      this.update(task.id, { state: "error", error: diskError, finishedAt: new Date().toISOString() });
      return;
    }
    mkdirSync(folder, { recursive: true });

    const fileName = safeFileNameFromUrl(task.url);
    const target = path.join(folder, fileName);
    if (existsSync(target)) {
      this.update(task.id, {
        state: "done",
        title: fileName,
        outputPath: target,
        progress: 100,
        finishedAt: new Date().toISOString(),
      });
      logger.info("music", `fichier déjà présent, téléchargement ignoré : ${fileName}`);
      return;
    }

    const abort = new AbortController();
    this.aborts.set(task.id, abort);
    this.update(task.id, { state: "downloading", progress: 0, title: fileName });

    try {
      const res = await fetch(task.url, { signal: abort.signal, redirect: "follow" });
      if (!res.ok || !res.body) throw new Error(`Le serveur a répondu ${res.status}.`);
      const total = Number(res.headers.get("content-length") ?? "0");
      const out = createWriteStream(target);
      let received = 0;
      let lastEmit = 0;

      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          out.write(Buffer.from(value));
          const now = Date.now();
          if (now - lastEmit > 250) {
            lastEmit = now;
            this.update(task.id, { progress: total > 0 ? Math.min(99, Math.round((received / total) * 100)) : null });
          }
        }
      }
      await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
      this.aborts.delete(task.id);
      this.update(task.id, { state: "done", progress: 100, outputPath: target, finishedAt: new Date().toISOString() });
      logger.info("music", `téléchargement direct terminé : ${target}`);
    } catch (err) {
      this.aborts.delete(task.id);
      if ((err as Error)?.name === "AbortError") {
        this.update(task.id, { state: "cancelled", finishedAt: new Date().toISOString() });
        return;
      }
      this.update(task.id, {
        state: "error",
        error: networkMessage(err) ?? (err instanceof Error ? err.message : String(err)),
        finishedAt: new Date().toISOString(),
      });
    }
  }

  /* ---- spotDL : python -m spotdl, arguments séparés, jamais de shell ---- */

  private async runSpotdl(task: MusicTask): Promise<void> {
    const folder = this.getDownloadFolder();
    const diskError = await this.ensureDiskSpace(folder);
    if (diskError) {
      this.update(task.id, { state: "error", error: diskError, finishedAt: new Date().toISOString() });
      return;
    }
    mkdirSync(folder, { recursive: true });

    const deps = await this.checkDeps();
    if (!deps.ready) {
      this.update(task.id, { state: "error", error: deps.hint, finishedAt: new Date().toISOString() });
      return;
    }

    this.update(task.id, { state: "analyzing", progress: null });

    const py = await this.resolvePython();
    if (!py) {
      this.update(task.id, { state: "error", error: "Python 3 est introuvable : installez-le depuis python.org.", finishedAt: new Date().toISOString() });
      return;
    }
    const outputTemplate = path.join(folder, "{artists} - {title}.{output-ext}");
    const args = [...py.baseArgs, ...spotdlModuleArgs(task.url, outputTemplate, deps.ffmpeg.path)];
    const pyLabel = py.baseArgs.length ? `${py.cmd} ${py.baseArgs.join(" ")}` : py.cmd;
    logger.info("music", `lancement spotdl : ${pyLabel} ${args.join(" ").slice(0, 220)}`);

    const child = spawn(py.cmd, args, { shell: false, windowsHide: true }) as ChildProcessWithoutNullStreams;
    this.children.set(task.id, child);

    let stdoutTail = "";
    let downloadedPath: string | null = null;
    let detectedTitle: string | null = null;

    const parse = (chunk: Buffer): void => {
      const text = String(chunk);
      stdoutTail = (stdoutTail + text).slice(-4000);
      for (const line of text.split(/\r?\n/)) {
        const pct = /(\d{1,3})\s*%/.exec(line);
        if (pct) {
          const p = Number(pct[1]);
          if (p >= 0 && p <= 100) this.update(task.id, { progress: p, state: "downloading" });
        }
        if (/searching|fetching|found\s+\d+\s+(song|track|result)/i.test(line)) {
          this.update(task.id, { state: "analyzing" });
        }
        if (/converting|encoding|muxing/i.test(line)) this.update(task.id, { state: "converting" });
        const dl = /saved (?:to|:)?\s*(.+?\.(?:mp3|m4a|flac|opus|ogg|wav))\s*$/i.exec(line);
        if (dl?.[1]) downloadedPath = dl[1].trim().replace(/^"|"$/g, "");
        const title = /Downloading\s+(.+?)\s*\(/i.exec(line) ?? /→\s*(.+?)\s*$/i.exec(line);
        if (title?.[1] && title[1].length < 120) detectedTitle = title[1];
      }
    };

    child.stdout.on("data", parse);
    child.stderr.on("data", parse);

    await new Promise<void>((resolve) => {
      child.on("error", (err) => {
        this.children.delete(task.id);
        this.update(task.id, {
          state: "error",
          error: `Impossible de lancer spotDL : ${err.message}`,
          finishedAt: new Date().toISOString(),
        });
        resolve();
      });
      child.on("close", (code) => {
        this.children.delete(task.id);
        const current = this.tasks.get(task.id);
        if (!current || current.state === "cancelled") return resolve();
        if (code === 0) {
          const finalPath = downloadedPath && existsSync(downloadedPath) ? downloadedPath : null;
          this.update(task.id, {
            state: "done",
            progress: 100,
            outputPath: finalPath,
            title: current.title ?? detectedTitle ?? (finalPath ? path.basename(finalPath) : null),
            finishedAt: new Date().toISOString(),
          });
          logger.info("music", `téléchargement spotDL terminé : ${finalPath ?? "(chemin non détecté)"}`);
        } else {
          this.update(task.id, {
            state: "error",
            error: spotdlFailureReason(stdoutTail, code),
            finishedAt: new Date().toISOString(),
          });
          logger.warn("music", `spotDL en échec (code ${code})`, { tail: stdoutTail.slice(-400) });
        }
        resolve();
      });
    });
  }

  clearHistory(): void {
    for (const [id, task] of this.tasks) {
      if (["done", "error", "cancelled"].includes(task.state)) this.tasks.delete(id);
    }
  }
}

/* ---------------- Messages d'erreur actionnables ---------------- */

function networkMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(msg)) {
    return "Problème réseau : vérifiez votre connexion Internet puis relancez le téléchargement.";
  }
  return null;
}

function spotdlFailureReason(tail: string, code: number | null): string {
  if (/KeyError|429|403|Too Many Requests|spotify.*(api|token)/i.test(tail)) {
    return "Spotify a temporairement refusé la lecture des métadonnées (limitation anti-robot). Réessayez dans quelques minutes, ou collez un lien YouTube / SoundCloud du même titre.";
  }
  if (/YT-DLP|AudioProvider|youtube.*(bot|captcha|confirm)/i.test(tail)) {
    return "La source audio a refusé la connexion (protection anti-robot, fréquent depuis certains réseaux). Réessayez plus tard ou depuis une autre connexion.";
  }
  if (/ffmpeg/i.test(tail)) {
    return "Problème FFmpeg : relancez « Installer les dépendances » depuis cette page.";
  }
  return networkMessage(tail) ?? `spotDL a échoué (code ${code}). Détail : ${tail.slice(-260)}`;
}

export const musicService = new MusicService();
