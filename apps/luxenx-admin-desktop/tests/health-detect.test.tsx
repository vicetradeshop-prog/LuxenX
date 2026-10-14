// @vitest-environment jsdom
/**
 * LuxenX Admin doit détecter et afficher l'état réel du backend
 * (santé + version) dès l'écran de connexion.
 */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  if (!window.matchMedia) {
    (window as unknown as Record<string, unknown>).matchMedia = (q: string) => ({
      matches: false,
      media: q,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    });
  }
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function installBridge() {
  (window as unknown as Record<string, unknown>).luxadmin = {
    app: { getInfo: async () => ({ version: "0.1.0", electron: "44", platform: "win32", packaged: false, storageEncrypted: true }) },
    settings: {
      get: async () => ({ backendUrl: "https://luxenx-backend.onrender.com" }),
      set: async (p: Record<string, unknown>) => ({ backendUrl: "https://luxenx-backend.onrender.com", ...p }),
    },
    tokens: {
      get: async () => ({ accessToken: null, refreshToken: null }),
      set: async () => true,
      clear: async () => true,
    },
    shell: { openExternal: async () => undefined },
    debug: { log: () => undefined },
    window: { minimize: () => undefined, maximizeToggle: () => undefined, close: () => undefined },
  };
}

describe("détection du backend par LuxenX Admin", () => {
  it("affiche l'état opérationnel et la version du backend", async () => {
    installBridge();
    // Fetch simulé AVANT l'import de l'application : le client API le capture.
    (globalThis as Record<string, unknown>).fetch = async (input: unknown) => {
      const url = String(input);
      if (url.includes("/api/v1/health")) {
        return new Response(
          JSON.stringify({ status: "ok", redis: "ok", storage: "upstash", version: "0.1.0", time: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const { App } = await import("../src/App.js");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(React.createElement(App));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("opérationnel");
    expect(text).toContain("Backend v0.1.0");
    expect(text).toContain("Redis : ok");
    root.unmount();
  });
});
