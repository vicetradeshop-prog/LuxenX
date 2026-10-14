import React from "react";
import ReactDOM from "react-dom/client";
import { LxErrorBoundary } from "@luxenx/ui";
import "@luxenx/ui/styles/luxenx.css";
import "./styles/admin.css";
import { App } from "./App.js";

/* Journalisation des erreurs renderer vers le processus principal. */
function report(where: string, err: unknown): void {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  try {
    window.luxadmin?.debug?.log(`${where} : ${message}`);
  } catch {
    // silencieux
  }
  console.error(`[LuxenX Admin] ${where} :`, err);
}

window.addEventListener("error", (e) => report("erreur globale", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => report("promesse non gérée", e.reason));

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <LxErrorBoundary>
      <App />
    </LxErrorBoundary>
  </React.StrictMode>,
);
