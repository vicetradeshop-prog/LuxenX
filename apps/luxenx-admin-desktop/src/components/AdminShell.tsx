/**
 * Coquille LuxenX Admin : barre latérale de navigation + pages.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Gauge,
  Users,
  LayoutGrid,
  Flame,
  Rocket,
  BookOpen,
  ScrollText,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { LogoMark, LxBadge } from "@luxenx/ui";
import { navigate, useAdminRoute, type AdminRoute } from "../lib/nav.js";
import { useAdmin } from "../state/AdminState.js";
import { DashboardAdminPage } from "../pages/DashboardAdminPage.js";
import { UsersPage } from "../pages/UsersPage.js";
import { CardsAdminPage } from "../pages/CardsAdminPage.js";
import { TrendingAdminPage } from "../pages/TrendingAdminPage.js";
import { ReleasesAdminPage } from "../pages/ReleasesAdminPage.js";
import { HelpAdminPage } from "../pages/HelpAdminPage.js";
import { AuditPage } from "../pages/AuditPage.js";
import { AdminSettingsPage } from "../pages/AdminSettingsPage.js";

const NAV: { route: AdminRoute; label: string; icon: typeof Gauge; section?: string }[] = [
  { route: "dashboard", label: "Tableau de bord", icon: Gauge },
  { route: "users", label: "Comptes", icon: Users, section: "Gestion" },
  { route: "cards", label: "Cartes", icon: LayoutGrid },
  { route: "trending", label: "Tendances", icon: Flame },
  { route: "help", label: "FAQ & guides", icon: BookOpen },
  { route: "releases", label: "Versions", icon: Rocket, section: "Publication" },
  { route: "audit", label: "Journal d'audit", icon: ScrollText },
  { route: "settings", label: "Configuration", icon: Settings, section: "Système" },
];

function Sidebar() {
  const route = useAdminRoute();
  const { admin, logout, backendHealth } = useAdmin();

  return (
    <aside className="lx-admin-sidebar">
      <div className="lx-sidebar-brand" style={{ padding: "6px 10px 18px" }}>
        <LogoMark size={36} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 750 }}>
            LuxenX <span className="lx-gradient-text">Admin</span>
          </div>
          <div className="lx-small" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <ShieldCheck size={11} style={{ color: backendHealth?.status === "ok" ? "var(--lx-success)" : "var(--lx-danger)" }} />
            <span className="lx-nav-label lx-muted" style={{ fontSize: 11 }}>
              {backendHealth?.status === "ok" ? "backend opérationnel" : "backend dégradé"}
            </span>
          </div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((entry) => {
          const Icon = entry.icon;
          return (
            <div key={entry.route}>
              {entry.section && <div className="lx-nav-section-label" style={{ padding: "14px 14px 6px" }}>{entry.section}</div>}
              <button
                className={`lx-nav-item ${route === entry.route ? "lx-nav-item-active" : ""}`}
                onClick={() => navigate(entry.route)}
              >
                <Icon size={17} strokeWidth={2} />
                <span className="lx-nav-label">{entry.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="lx-sidebar-footer" style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 10px" }}>
          <div className="lx-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
            {(admin?.username ?? "A").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="lx-nav-label" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {admin?.username}
            </div>
            <LxBadge tone="violet">ADMIN</LxBadge>
          </div>
        </div>
        <button className="lx-nav-item" onClick={() => void logout()}>
          <LogOut size={16} />
          <span className="lx-nav-label">Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

const TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

function PageSwitch() {
  const route = useAdminRoute();
  switch (route) {
    case "dashboard": return <DashboardAdminPage key="d" />;
    case "users": return <UsersPage key="u" />;
    case "cards": return <CardsAdminPage key="c" />;
    case "trending": return <TrendingAdminPage key="t" />;
    case "releases": return <ReleasesAdminPage key="r" />;
    case "help": return <HelpAdminPage key="h" />;
    case "audit": return <AuditPage key="a" />;
    case "settings": return <AdminSettingsPage key="s" />;
    default: return <DashboardAdminPage key="d0" />;
  }
}

export function AdminShell() {
  return (
    <>
      <div className="lx-titlebar">
        <ShieldCheck size={13} style={{ opacity: 0.5 }} aria-hidden />
        <span className="lx-titlebar-title">LuxenX Admin — console d'administration</span>
      </div>
      <div className="lx-admin-shell">
        <Sidebar />
        <main className="lx-admin-content">
          <div className="lx-admin-content-narrow">
            <AnimatePresence mode="wait">
              <motion.div {...TRANSITION}>
                <PageSwitch />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
