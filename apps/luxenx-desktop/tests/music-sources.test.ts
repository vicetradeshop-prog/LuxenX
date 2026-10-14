import { describe, it, expect } from "vitest";
import {
  detectSource,
  isBlockedSource,
  isDirectSource,
  isSpotdlSource,
  safeFileNameFromUrl,
  spotdlModuleArgs,
} from "../electron/music-sources.js";

describe("détection de source", () => {
  it("reconnaît les plateformes", () => {
    expect(detectSource("https://open.spotify.com/track/123")).toBe("spotify");
    expect(detectSource("https://www.deezer.com/fr/track/42")).toBe("deezer");
    expect(detectSource("https://music.apple.com/fr/album/x/1")).toBe("apple-music");
    expect(detectSource("https://soundcloud.com/artiste/titre")).toBe("soundcloud");
    expect(detectSource("https://youtu.be/abc123")).toBe("youtube");
    expect(detectSource("https://artiste.bandcamp.com/track/titre")).toBe("bandcamp");
    expect(detectSource("https://archive.org/details/xyz")).toBe("archive");
  });

  it("reconnaît un fichier audio/vidéo direct", () => {
    expect(detectSource("https://cdn.exemple.com/musique/titre.mp3")).toBe("direct");
    expect(detectSource("https://cdn.exemple.com/video/clip.mp4")).toBe("direct");
    expect(detectSource("https://cdn.exemple.com/son.FLAC")).toBe("direct");
  });

  it("classe le reste en web", () => {
    expect(detectSource("https://blog.exemple.com/article")).toBe("web");
  });

  it("rejette les URL invalides ou non http", () => {
    expect(detectSource("pas une url")).toBe("invalide");
    expect(detectSource("ftp://serveur/fichier.mp3")).toBe("invalide");
    expect(detectSource("file:///C:/musique.mp3")).toBe("invalide");
    expect(detectSource("")).toBe("invalide");
  });
});

describe("politique de droits", () => {
  it("Spotify/Deezer/SoundCloud/YouTube : compatibles spotDL après confirmation des droits", () => {
    expect(isSpotdlSource(detectSource("https://open.spotify.com/track/1"))).toBe(true);
    expect(isSpotdlSource(detectSource("https://www.deezer.com/track/2"))).toBe(true);
    expect(isSpotdlSource(detectSource("https://soundcloud.com/a/b"))).toBe(true);
    expect(isSpotdlSource(detectSource("https://youtu.be/x"))).toBe(true);
    expect(isBlockedSource(detectSource("https://open.spotify.com/track/1"))).toBe(false);
  });

  it("Apple Music reste bloqué (aucun support spotDL, DRM)", () => {
    expect(isBlockedSource(detectSource("https://music.apple.com/album/3"))).toBe(true);
  });

  it("autorise les fichiers directs sans dépendance", () => {
    expect(isBlockedSource(detectSource("https://cdn.exemple.com/a.mp3"))).toBe(false);
    expect(isDirectSource(detectSource("https://cdn.exemple.com/a.mp3"))).toBe(true);
  });
});

describe("arguments spotDL (sécurité : jamais de shell)", () => {
  it("construit un tableau d'arguments séparés, URL incluse", () => {
    const args = spotdlModuleArgs("https://open.spotify.com/track/1", "C:\\Musique\\{artists} - {title}.{output-ext}", null);
    expect(args[0]).toBe("-m");
    expect(args[1]).toBe("spotdl");
    expect(args).toContain("https://open.spotify.com/track/1");
    expect(args.join(" ")).not.toContain("&&");
    expect(args).not.toContainEqual(expect.stringMatching(/;|\||`/));
  });

  it("passe le chemin FFmpeg détecté quand il existe", () => {
    const args = spotdlModuleArgs("https://youtu.be/x", "/tmp/{title}.{output-ext}", "/opt/ffmpeg/bin/ffmpeg");
    expect(args.slice(-2)).toEqual(["--ffmpeg", "/opt/ffmpeg/bin/ffmpeg"]);
  });
});

describe("nom de fichier sûr", () => {
  it("extrait un nom propre depuis l'URL", () => {
    expect(safeFileNameFromUrl("https://cdn.exemple.com/audio/mon%20titre.mp3")).toBe("mon titre.mp3");
  });

  it("neutralise les caractères interdits Windows", () => {
    const name = safeFileNameFromUrl("https://cdn.exemple.com/a/ti:tre<interdit>.mp3");
    expect(name).not.toMatch(/[<>:"|?*]/);
  });

  it("retombe sur un nom par défaut si l'URL est invalide", () => {
    expect(safeFileNameFromUrl("n'importe quoi")).toBe("telechargement");
  });
});
