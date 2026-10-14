import { describe, it, expect, vi } from "vitest";
import { ApiClient, ApiClientError } from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ApiClient", () => {
  it("renvoie le corps typé d'une requête réussie", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ cards: [] }));
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: { getAccessToken: () => null, getRefreshToken: () => null, setTokens: () => undefined },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const res = await client.getCards();
    expect(res).toEqual({ cards: [] });
  });

  it("joint le jeton d'accès aux requêtes authentifiées", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: { getAccessToken: () => "TOKEN", getRefreshToken: () => null, setTokens: () => undefined },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.me();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN");
  });

  it("transforme une panne réseau en ApiClientError.network_error", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: { getAccessToken: () => null, getRefreshToken: () => null, setTokens: () => undefined },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(client.getCards()).rejects.toMatchObject({ code: "network_error" });
  });

  it("rafraîchit le jeton puis rejoue la requête après un 401", async () => {
    let calls = 0;
    const store = {
      access: "OLD",
      refresh: "REFRESH",
      getAccessToken() {
        return this.access;
      },
      getRefreshToken() {
        return this.refresh;
      },
      setTokens(a: string | null) {
        this.access = a;
      },
    };
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls++;
      const u = String(url);
      if (u.includes("/auth/refresh")) {
        return jsonResponse({ accessToken: "NEW", refreshToken: "REFRESH2", expiresIn: 900, user: { id: "u" } });
      }
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      if (auth === "Bearer OLD" && calls <= 1) return jsonResponse({ error: { code: "unauthorized", message: "x" } }, 401);
      return jsonResponse({ email: "a@b.co" });
    });
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: store,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const me = await client.me();
    expect((me as { email: string }).email).toBe("a@b.co");
    expect(store.access).toBe("NEW");
  });

  it("signale l'expiration de session quand le refresh échoue", async () => {
    const onExpired = vi.fn();
    const fetchMock = vi.fn(async () => jsonResponse({ error: { code: "unauthorized", message: "nope" } }, 401));
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: { getAccessToken: () => "OLD", getRefreshToken: () => "R", setTokens: () => undefined },
      onSessionExpired: onExpired,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(client.me()).rejects.toBeInstanceOf(ApiClientError);
    expect(onExpired).toHaveBeenCalled();
  });

  it("expose les codes d'erreur du backend", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { code: "forbidden", message: "Accès refusé." } }, 403),
    );
    const client = new ApiClient({
      baseUrl: "http://test.local",
      tokenStore: { getAccessToken: () => "T", getRefreshToken: () => null, setTokens: () => undefined },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(client.adminStats()).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

describe("message d'erreur réseau", () => {
  it("indique l'URL visée pour un diagnostic immédiat", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new ApiClient({
      baseUrl: "https://luxenx.onrender.com",
      tokenStore: { getAccessToken: () => null, getRefreshToken: () => null, setTokens: () => undefined },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(client.getCards()).rejects.toThrow(/luxenx\.onrender\.com/);
  });
});
