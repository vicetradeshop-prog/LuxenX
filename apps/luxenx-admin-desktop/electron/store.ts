/**
 * LuxenX Admin — stockage local : URL du backend + jetons chiffrés.
 * Identique en principe à LuxenX (safeStorage/DPAPI), indépendant en pratique.
 */
import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

export interface AdminSettings {
  backendUrl: string;
}

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

export const DEFAULT_SETTINGS: AdminSettings = {
  backendUrl: defaultBackendUrl(),
};

function userDataDir(): string {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const settingsFile = () => path.join(userDataDir(), "luxenx-admin-settings.json");
const tokensFile = () => path.join(userDataDir(), "luxenx-admin-session.bin");

export function readSettings(): AdminSettings {
  try {
    if (existsSync(settingsFile())) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(readFileSync(settingsFile(), "utf8")) as Partial<AdminSettings>) };
    }
  } catch {
    // repartir des valeurs par défaut
  }
  return { ...DEFAULT_SETTINGS };
}

export function writeSettings(patch: Partial<AdminSettings>): AdminSettings {
  const next = { ...readSettings(), ...patch };
  const tmp = settingsFile() + ".tmp";
  writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
  renameSync(tmp, settingsFile());
  return next;
}

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
      return JSON.parse(safeStorage.decryptString(Buffer.from(raw.slice(3), "base64"))) as StoredTokens;
    }
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
