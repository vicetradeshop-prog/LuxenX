/**
 * Stockage local chiffré (jetons) + préférences (JSON).
 * Les jetons sont chiffrés via safeStorage (DPAPI sur Windows) lorsque
 * c'est disponible ; jamais de mot de passe stocké en clair.
 */
import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

export interface LocalSettings {
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
  /** Chemin FFmpeg détecté/installé par le service musique. */
  ffmpegPath: string;
  /** L'utilisateur a-t-il déjà choisi son dossier de téléchargement ? */
  downloadFolderChosen: boolean;
}

/** Adresse par défaut : celle intégrée à la compilation (backend hébergé),
 *  sinon localhost pour le développement. */
function defaultBackendUrl(): string {
  try {
    const file = path.join(__dirname, "default-backend.json");
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as { backendUrl?: string };
      if (parsed.backendUrl && /^https?:\/\//.test(parsed.backendUrl)) return parsed.backendUrl;
    }
  } catch {
    // valeur par défaut
  }
  return "http://localhost:8787";
}

export const DEFAULT_SETTINGS: LocalSettings = {
  backendUrl: defaultBackendUrl(),
  animationsEnabled: true,
  introEnabled: true,
  introSeen: false,
  notificationsEnabled: true,
  autoCheckUpdates: true,
  autoDownloadUpdates: true,
  autostartEnabled: false,
  downloadFolder: "",
  reduceMotion: false,
  ffmpegPath: "",
  downloadFolderChosen: false,
};

function userDataDir(): string {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function settingsFile(): string {
  return path.join(userDataDir(), "luxenx-settings.json");
}

function tokensFile(): string {
  return path.join(userDataDir(), "luxenx-session.bin");
}

/* ---------------- Préférences ---------------- */

export function readSettings(): LocalSettings {
  let loaded: LocalSettings = { ...DEFAULT_SETTINGS };
  try {
    if (existsSync(settingsFile())) {
      const raw = JSON.parse(readFileSync(settingsFile(), "utf8")) as Partial<LocalSettings>;
      loaded = { ...DEFAULT_SETTINGS, ...raw };
    }
  } catch {
    // Fichier corrompu : on repart des valeurs par défaut.
  }
  if (!loaded.downloadFolder) {
    loaded.downloadFolder = path.join(app.getPath("music"), "LuxenX");
  }
  // SECURITE DE DEPLOIEMENT : l'adresse du backend est une décision de
  // déploiement (intégrée à la compilation). Une ancienne préférence
  // locale ne doit jamais la remplacer : sans cela, une réinstallation
  // resterait bloquée sur une URL périmée (ex. localhost) sans que
  // l'utilisateur puisse la corriger.
  loaded.backendUrl = DEFAULT_SETTINGS.backendUrl;
  return loaded;
}

export function writeSettings(patch: Partial<LocalSettings>): LocalSettings {
  const next = { ...readSettings(), ...patch };
  const tmp = settingsFile() + ".tmp";
  writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
  renameSync(tmp, settingsFile()); // écriture atomique
  return next;
}

/* ---------------- Jetons (chiffrés) ---------------- */

interface StoredTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export function readTokens(): StoredTokens {
  try {
    if (!existsSync(tokensFile())) return { accessToken: null, refreshToken: null };
    const raw = readFileSync(tokensFile(), "utf8");
    if (raw.startsWith("v1:")) {
      if (!safeStorage.isEncryptionAvailable()) return { accessToken: null, refreshToken: null };
      const json = safeStorage.decryptString(Buffer.from(raw.slice(3), "base64"));
      return JSON.parse(json) as StoredTokens;
    }
    // Repli non chiffré : développement uniquement (Linux sans keyring).
    if (!app.isPackaged) {
      return JSON.parse(Buffer.from(raw.slice(6), "base64").toString("utf8")) as StoredTokens;
    }
    return { accessToken: null, refreshToken: null };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function writeTokens(tokens: StoredTokens): void {
  const json = JSON.stringify(tokens);
  let payload: string;
  if (safeStorage.isEncryptionAvailable()) {
    payload = "v1:" + safeStorage.encryptString(json).toString("base64");
  } else if (!app.isPackaged) {
    payload = "plain:" + Buffer.from(json, "utf8").toString("base64");
  } else {
    // En production sans chiffrement disponible : ne pas persister.
    return;
  }
  const tmp = tokensFile() + ".tmp";
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, tokensFile());
}

export function clearTokens(): void {
  writeTokens({ accessToken: null, refreshToken: null });
}

export function storageEncryptionActive(): boolean {
  return safeStorage.isEncryptionAvailable();
}
