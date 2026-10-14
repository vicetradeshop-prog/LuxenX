/**
 * Service releases : registre des versions publiées (Upstash) et
 * intégration GitHub optionnelle (lecture de l'existence d'une release).
 *
 * Principe de fiabilité : une release n'est marquée "published" dans le
 * registre que si la publication GitHub a réellement abouti (vérification
 * côté serveur lorsque GITHUB_TOKEN est configuré, ou confirmation
 * explicite depuis publier.bat via GitHub CLI).
 */
import type { ReleaseInfo } from "@luxenx/shared";
import type { KvStore } from "../lib/kv.js";
import { keys } from "../lib/keys.js";
import type { BackendConfig } from "../config.js";
import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function releasesService(kv: KvStore, cfg: BackendConfig) {
  async function readRelease(version: string): Promise<ReleaseInfo | null> {
    const raw = await kv.get(keys.release(version));
    return raw ? (JSON.parse(raw) as ReleaseInfo) : null;
  }

  return {
    async list(): Promise<ReleaseInfo[]> {
      const versions = await kv.smembers(keys.releasesIndex());
      const out: ReleaseInfo[] = [];
      for (const v of versions) {
        const r = await readRelease(v);
        if (r) out.push(r);
      }
      return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    },

    async get(version: string): Promise<ReleaseInfo | null> {
      return readRelease(version);
    },

    async latest(): Promise<ReleaseInfo | null> {
      const all = (await this.list()).filter((r) => r.status === "published" && r.channel === "stable");
      return all[0] ?? null;
    },

    async createDraft(input: Omit<ReleaseInfo, "publishedAt" | "status" | "githubReleaseUrl">): Promise<ReleaseInfo> {
      const existing = await readRelease(input.version);
      if (existing && existing.status === "published") {
        throw ApiError.conflict("release_exists", `La version ${input.version} est déjà publiée. Choix d'une autre version requis.`);
      }
      const release: ReleaseInfo = {
        ...input,
        status: "draft",
        githubReleaseUrl: null,
        publishedAt: new Date().toISOString(),
      };
      await kv.set(keys.release(release.version), JSON.stringify(release));
      await kv.sadd(keys.releasesIndex(), release.version);
      return release;
    },

    /**
     * Marque une release comme publiée. Si GITHUB_TOKEN est configuré,
     * vérifie d'abord que la release GitHub existe réellement.
     */
    async markPublished(version: string, githubReleaseUrl?: string | null): Promise<ReleaseInfo> {
      const release = await readRelease(version);
      if (!release) throw ApiError.notFound(`Aucune release ${version} enregistrée (créez d'abord un brouillon).`);

      let url = githubReleaseUrl ?? release.githubReleaseUrl;
      if (cfg.github?.token) {
        const check = await this.checkGithubRelease(version);
        if (!check.exists) {
          release.status = "failed";
          await kv.set(keys.release(version), JSON.stringify(release));
          throw ApiError.upstream(
            `La release GitHub v${version} est introuvable : publication refusée. Téléversez d'abord les artefacts (publier.bat ou section Versions).`,
          );
        }
        url = check.url;
      }

      const published: ReleaseInfo = {
        ...release,
        status: "published",
        githubReleaseUrl: url ?? (cfg.github ? `https://github.com/${cfg.github.owner}/${cfg.github.repo}/releases/tag/v${version}` : null),
        publishedAt: new Date().toISOString(),
      };
      await kv.set(keys.release(version), JSON.stringify(published));
      await kv.sadd(keys.releasesIndex(), version);
      return published;
    },

    async delete(version: string): Promise<void> {
      await kv.del(keys.release(version));
      await kv.srem(keys.releasesIndex(), version);
    },

    /**
     * Vérifie l'existence d'une release GitHub.
     * - Avec GITHUB_TOKEN : requête API authentifiée (repos privés OK).
     * - Sans token : requête anonyme (repos publics uniquement).
     * Ne lève jamais d'erreur bloquante : renvoie un diagnostic.
     */
    async checkGithubRelease(version: string): Promise<{
      exists: boolean;
      url: string | null;
      checkedWithToken: boolean;
      message: string;
    }> {
      if (!cfg.github?.owner) {
        return {
          exists: false,
          url: null,
          checkedWithToken: false,
          message: "GITHUB_OWNER/GITHUB_REPO non configurés : vérification GitHub impossible.",
        };
      }
      const tag = `v${version}`;
      const apiUrl = `https://api.github.com/repos/${cfg.github.owner}/${cfg.github.repo}/releases/tags/${encodeURIComponent(tag)}`;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "LuxenX-Backend",
      };
      if (cfg.github.token) headers.Authorization = `Bearer ${cfg.github.token}`;

      try {
        const res = await fetch(apiUrl, { headers });
        if (res.status === 404) {
          return {
            exists: false,
            url: null,
            checkedWithToken: !!cfg.github.token,
            message: `Aucune release GitHub « ${tag} » (dépôt ${cfg.github.owner}/${cfg.github.repo}).`,
          };
        }
        if (!res.ok) {
          return {
            exists: false,
            url: null,
            checkedWithToken: !!cfg.github.token,
            message: `GitHub a répondu ${res.status}. Vérifiez les droits du jeton.`,
          };
        }
        const data = (await res.json()) as { html_url?: string };
        return {
          exists: true,
          url: data.html_url ?? null,
          checkedWithToken: !!cfg.github.token,
          message: `Release GitHub « ${tag} » trouvée.`,
        };
      } catch (err) {
        logger.warn("releases", "échec de vérification GitHub", { err: String(err) });
        return {
          exists: false,
          url: null,
          checkedWithToken: !!cfg.github.token,
          message: "Impossible de joindre l'API GitHub (réseau).",
        };
      }
    },
  };
}

export type ReleasesService = ReturnType<typeof releasesService>;
