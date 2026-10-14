// @vitest-environment jsdom
/**
 * Test de fumée : monte réellement l'application LuxenX dans un DOM
 * simulé, avec un bridge Electron simulé. Attrape tout crash au montage
 * (le symptôme historique était une fenêtre noire).
 */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const noopUnsub = () => undefined;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function installBridge(opts: { introEnabled: boolean; animationsEnabled?: boolean }) {
  const settings = {
    backendUrl: "http://localhost:8787",
    animationsEnabled: opts.animationsEnabled ?? false,
    introEnabled: opts.introEnabled,
    introSeen: false,
    notificationsEnabled: true,
    autoCheckUpdates: true,
    autoDownloadUpdates: true,
    autostartEnabled: false,
    downloadFolder: "C:\\Musique\\LuxenX",
    reduceMotion: false,
  };
  (window as unknown as Record<string, unknown>).luxenx = {
    app: {
      getInfo: async () => ({
        version: "0.1.0",
        electron: "44",
        chrome: "130",
        node: "20",
        platform: "win32",
        packaged: false,
        storageEncrypted: true,
      }),
    },
    settings: {
      get: async () => ({ ...settings }),
      set: async (p: Record<string, unknown>) => ({ ...settings, ...p }),
    },
    tokens: {
      get: async () => ({ accessToken: null, refreshToken: null }),
      set: async () => true,
      clear: async () => true,
    },
    autostart: { get: async () => false, set: async () => true },
    updater: {
      getStatus: async () => ({ state: "dev" }),
      check: async () => ({ state: "dev" }),
      download: async () => true,
      install: async () => true,
      onState: () => noopUnsub,
    },
    dialog: { chooseFolder: async () => null },
    shell: {
      openPath: async () => "",
      showItemInFolder: async () => true,
      openExternal: async () => undefined,
    },
    music: {
      getFolder: async () => settings.downloadFolder,
      analyze: async (url: string) => ({
        url,
        source: "direct",
        title: "t",
        artist: null,
        durationSeconds: null,
        trackCount: null,
        available: false,
        message: "m",
      }),
      start: async (url: string) => ({
        id: "1",
        url,
        source: "direct",
        kind: "direct",
        state: "error",
        progress: null,
        title: null,
        outputPath: null,
        error: "x",
        createdAt: new Date().toISOString(),
        finishedAt: null,
      }),
      cancel: async () => true,
      list: async () => [],
      clearHistory: async () => [],
      deps: async () => ({
        spotdl: { installed: false, version: null },
        ffmpeg: { installed: false, version: null },
        python: { installed: true, version: "3.11" },
        ready: false,
        hint: "h",
      }),
      installDeps: async () => ({
        ok: true,
        message: "m",
        deps: {
          spotdl: { installed: true, version: "4" },
          ffmpeg: { installed: true, version: "7" },
          python: { installed: true, version: "3.11" },
          ready: true,
          hint: "",
        },
      }),
      onTask: () => noopUnsub,
      onDepsLog: () => noopUnsub,
    },
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
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  window.scrollTo = (() => undefined) as unknown as typeof window.scrollTo;
});

async function mountApp() {
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
  return { root, text: () => document.body.textContent ?? "" };
}

describe("montage de l'application LuxenX (anti écran noir)", () => {
  it("affiche l'écran de connexion quand aucune session n'existe", async () => {
    installBridge({ introEnabled: false });
    const { root, text } = await mountApp();
    expect(text()).toContain("Connexion");
    expect(text()).toContain("Créer un compte");
    root.unmount();
  });

  it("affiche l'introduction à la première utilisation", async () => {
    installBridge({ introEnabled: true, animationsEnabled: true });
    const { root, text } = await mountApp();
    expect(text()).toContain("Passer l'introduction");
    root.unmount();
  });
});
