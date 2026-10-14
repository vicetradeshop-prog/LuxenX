/**
 * Racine de l'application LuxenX.
 * Enchaîne : introduction -> authentification -> coquille principale,
 * avec transitions animées (2D).
 */
import { AnimatePresence, motion } from "framer-motion";
import { ToastProvider } from "@luxenx/ui";
import { AppProvider, useApp } from "./state/AppState.js";
import { useRoute } from "./lib/nav.js";
import { IntroScreen } from "./pages/IntroScreen.js";
import { AuthPage } from "./pages/AuthPage.js";
import { MainShell } from "./components/MainShell.js";
import { LxSpinner } from "@luxenx/ui";

function Router() {
  const route = useRoute();
  const { phase } = useApp();

  if (phase === "loading") {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, position: "relative", zIndex: 1 }}>
        <LxSpinner size={30} />
        <div className="lx-muted lx-small">Chargement de LuxenX…</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {route.name === "intro" && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <IntroScreen />
        </motion.div>
      )}
      {route.name === "auth" && phase === "anonymous" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <AuthPage />
        </motion.div>
      )}
      {phase === "authenticated" && route.name !== "intro" && route.name !== "auth" && (
        <motion.div
          key="shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ height: "100vh" }}
        >
          <MainShell />
        </motion.div>
      )}
      {phase === "anonymous" && route.name !== "intro" && route.name !== "auth" && (
        <motion.div key="auth-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AuthPage />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <Router />
      </AppProvider>
    </ToastProvider>
  );
}
