/**
 * Types partagés du bridge (copie légère des types du service musique,
 * pour que le renderer n'importe pas de code Node).
 */
export interface LocalSettingsLike {
  backendUrl: string;
  animationsEnabled: boolean;
  introEnabled: boolean;
  introSeen: boolean;
  notificationsEnabled: boolean;
  autoCheckUpdates: boolean;
  autoDownloadUpdates: boolean;
  autostartEnabled: boolean;
  downloadFolder: string;
  reduceMotion: boolean;
  ffmpegPath: string;
  downloadFolderChosen: boolean;
}

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
  python: { installed: boolean; version: string | null; cmd?: string | null; baseArgs?: string[] };
  ready: boolean;
  hint: string;
}

export interface UpdateStatus {
  state: "idle" | "dev" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
}

export interface AppInfo {
  version: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
  packaged: boolean;
  storageEncrypted: boolean;
}
