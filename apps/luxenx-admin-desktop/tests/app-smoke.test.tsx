// @vitest-environment jsdom
/**
 * Test de fumée LuxenX Admin : monte l'application avec un bridge simulé.
 */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function installBridge() {
  (window as unknown as Record<string, unknown>).luxadmin = {
    app: {
      getInfo: async () => ({
        version: "0.1.0",
        electron: "44",
        platform: "win32",
        packaged: false,
        storageEncrypted: true,
      }),
    },
    settings: {
      get: async () => ({ backendUrl: "http://localhost:8787" }),
      set: async (p: Record<string, unknown>) => ({ backendUrl: "http://localhost:8787", ...p }),
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

describe("montage de LuxenX Admin (anti écran noir)", () => {
  it("affiche l'écran de connexion administrateur sans session", async () => {
    installBridge();
    const { App } = await import("../src/App.js");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(React.createElement(App));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Ouvrir la console");
    expect(text).toContain("Console d'administration");
    root.unmount();
  });
});

describe("aide au diagnostic quand le backend est injoignable", () => {
  it("affiche les deux causes possibles sur l'écran de connexion", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    // fetch réel qui échoue (aucun serveur) : le composant doit afficher l'aide.
    await act(async () => {
      root.render(React.createElement((await import("../src/App.js")).App));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Backend injoignable à cette adresse");
    root.unmount();
  });
});
