/**
 * Détection de source d'une URL — logique PURE, sans dépendance Electron.
 * Isolée dans ce module pour être testable unitairement.
 *
 * Politique de droits (décision du propriétaire du produit) :
 *  - Spotify / Deezer / SoundCloud / YouTube / Bandcamp : compatibles via
 *    spotDL, téléchargement démarré UNIQUEMENT après confirmation
 *    explicite des droits par l'utilisateur (case obligatoire dans l'app).
 *  - Apple Music : aucun support spotDL → modes officiels expliqués.
 *  - Fichiers directs : téléchargement natif, sans dépendance.
 */

export const AUDIO_EXT = /\.(mp3|flac|wav|m4a|ogg|opus|aac|wma)$/i;
export const VIDEO_EXT = /\.(mp4|mkv|webm|avi|mov|m4v)$/i;

export type MusicSource =
  | "spotify"
  | "deezer"
  | "apple-music"
  | "soundcloud"
  | "youtube"
  | "bandcamp"
  | "archive"
  | "direct"
  | "web"
  | "invalide";

/** Sources jamais téléchargeables dans l'application. */
export const BLOCKED_SOURCES: readonly MusicSource[] = ["apple-music", "invalide"];

/** Sources traitées par spotDL. */
export const SPOTDL_SOURCES: readonly MusicSource[] = [
  "spotify",
  "deezer",
  "soundcloud",
  "youtube",
  "bandcamp",
];

/** Sources téléchargeables sans dépendance externe. */
export const DIRECT_SOURCES: readonly MusicSource[] = ["direct"];

export function detectSource(rawUrl: string): MusicSource {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return "invalide";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "invalide";
  const host = url.hostname.toLowerCase();
  if (host.includes("spotify.com")) return "spotify";
  if (host.includes("deezer.com")) return "deezer";
  if (host.includes("apple.com")) return "apple-music";
  if (host.includes("soundcloud.com")) return "soundcloud";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("bandcamp.com")) return "bandcamp";
  if (host.includes("archive.org")) return "archive";
  if (AUDIO_EXT.test(url.pathname) || VIDEO_EXT.test(url.pathname)) return "direct";
  return "web";
}

export function isBlockedSource(source: MusicSource): boolean {
  return (BLOCKED_SOURCES as readonly string[]).includes(source);
}

export function isDirectSource(source: MusicSource): boolean {
  return (DIRECT_SOURCES as readonly string[]).includes(source);
}

export function isSpotdlSource(source: MusicSource): boolean {
  return (SPOTDL_SOURCES as readonly string[]).includes(source);
}

/** Message d'analyse affiché selon la source (jamais de données inventées). */
export function sourceMessage(source: MusicSource): string | null {
  switch (source) {
    case "spotify":
    case "deezer":
      return "Source compatible spotDL : les métadonnées (titre, artiste, durée) seront lues pendant le téléchargement. Confirmez que vous disposez des droits sur ce contenu.";
    case "soundcloud":
    case "youtube":
    case "bandcamp":
      return "Source compatible spotDL. Confirmez que vous disposez des droits sur ce contenu.";
    case "direct":
      return "Fichier direct détecté. Téléchargement natif, sans dépendance.";
    case "archive":
      return "Archive.org : vérifiez la licence du contenu avant téléchargement.";
    case "apple-music":
      return "Apple Music protège ses contenus (DRM/abonnement). LuxenX ne contourne aucune protection : utilisez l'écoute officielle ou l'achat de la piste.";
    case "web":
      return "Page web non reconnue : collez de préférence un lien direct vers un fichier audio/vidéo ou un lien Spotify/SoundCloud/YouTube.";
    default:
      return "Lien invalide. Collez une URL complète commençant par http:// ou https://";
  }
}

/**
 * Arguments spotDL — TOUJOURS sous forme de tableau (jamais de shell,
 * jamais de concaténation d'URL dans une commande).
 * Commande complète : python -m spotdl download <url> ...
 */
export function spotdlModuleArgs(
  url: string,
  outputTemplate: string,
  ffmpegPath: string | null,
): string[] {
  const args = [
    "-m",
    "spotdl",
    "download",
    url,
    "--output",
    outputTemplate,
    "--format",
    "mp3",
    "--bitrate",
    "320k",
    "--log-level",
    "INFO",
  ];
  if (ffmpegPath) args.push("--ffmpeg", ffmpegPath);
  return args;
}

/** Nom de fichier sûr dérivé d'un chemin d'URL (caractères Windows interdits neutralisés). */
export function safeFileNameFromUrl(rawUrl: string, fallback = "telechargement"): string {
  let pathname = "";
  try {
    pathname = decodeURIComponent(new URL(rawUrl).pathname);
  } catch {
    return fallback;
  }
  const base = pathname.split("/").pop() || fallback;
  // eslint-disable-next-line no-control-regex -- assainissement volontaire
  const cleaned = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
  return cleaned.slice(0, 180) || fallback;
}
