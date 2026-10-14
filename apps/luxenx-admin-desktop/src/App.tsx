/**
 * Racine de LuxenX Admin.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ToastProvider, AmbientBackground, LxSpinner } from "@luxenx/ui";
import { AdminProvider, useAdmin } from "./state/AdminState.js";
import { useAdminRoute } from "./lib/nav.js";
import { LoginPage } from "./pages/LoginPage.js";
import { AdminShell } from "./components/AdminShell.js";

function Router() {
  const route = useAdminRoute();
  const { phase } = useAdmin();

  if (phase === "loading") {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, position: "relative", zIndex: 1 }}>
        <LxSpinner size={30} />
        <div className="lx-muted lx-small">Connexion au backend LuxenX…</div>
      </div>
    );
  }

  if (phase !== "admin" || route === "login") {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <LoginPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div key="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100vh" }}>
      <AdminShell />
    </motion.div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AdminProvider>
        <AmbientBackground />
        <Router />
      </AdminProvider>
    </ToastProvider>
  );
}
