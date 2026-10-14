/**
 * Coquille principale : barre de titre, navigation latérale, en-tête,
 * pages animées.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Flame,
  History,
  UserRound,
  Settings,
  LifeBuoy,
  LogOut,
  ArrowDownToLine,
  ChevronLeft,
} from "lucide-react";
import { AmbientBackground, LogoMark, LxBadge } from "@luxenx/ui";
import { useApp } from "../state/AppState.js";
import { navigate, useRoute, type Route } from "../lib/nav.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { FeaturesPage } from "../pages/FeaturesPage.js";
import { TrendingPage } from "../pages/TrendingPage.js";
import { HistoryPage } from "../pages/HistoryPage.js";
import { MusicPage } from "../pages/MusicPage.js";
import { AccountPage } from "../pages/AccountPage.js";
import { SettingsPage } from "../pages/SettingsPage.js";
import { HelpPage } from "../pages/HelpPage.js";
import { UpdateBanner } from "./UpdateBanner.js";

const NAV_MAIN: { route: Route["name"]; label: string; icon: typeof Home }[] = [
  { route: "dashboard", label: "Accueil", icon: Home },
  { route: "features", label: "Fonctionnalités", icon: LayoutGrid },
  { route: "trending", label: "Tendances", icon: Flame },
  { route: "history", label: "Historique", icon: History },
];

const NAV_ACCOUNT: { route: Route["name"]; label: string; icon: typeof Home }[] = [
  { route: "account", label: "Mon compte", icon: UserRound },
  { route: "settings", label: "Paramètres", icon: Settings },
  { route: "help", label: "Centre d'aide", icon: LifeBuoy },
];

function Sidebar() {
  const route = useRoute();
  const { user, logout, updateStatus } = useApp();
  const updatePending = updateStatus.state === "available" || updateStatus.state === "downloaded";

  const item = (entry: { route: Route["name"]; label: string; icon: typeof Home }) => {
    const Icon = entry.icon;
    const active =
      route.name === entry.route ||
      (entry.route === "features" && route.name === "music");
    return (
      <button
        key={entry.route}
        className={`lx-nav-item ${active ? "lx-nav-item-active" : ""}`}
        onClick={() => navigate({ name: entry.route })}
      >
        <Icon size={18} strokeWidth={2} />
        <span className="lx-nav-label">{entry.label}</span>
        {entry.route === "settings" && updatePending && <span className="lx-nav-update-dot" title="Mise à jour disponible" />}
      </button>
    );
  };

  return (
    <aside className="lx-sidebar">
      <div className="lx-sidebar-brand">
        <LogoMark size={38} />
        <div className="lx-sidebar-brand-name">
          Luxen<span className="lx-gradient-text">X</span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_MAIN.map(item)}
      </nav>

      <div className="lx-nav-section-label">Vous</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ACCOUNT.map(item)}
      </nav>

      <div className="lx-sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 12px" }}>
          <div className="lx-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
            {(user?.username ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.username}
            </div>
            <div className="lx-small lx-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button className="lx-nav-item" onClick={() => void logout()} title="Se déconnecter">
          <LogOut size={17} strokeWidth={2} />
          <span className="lx-nav-label">Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}

function Header() {
  const { user, data } = useApp();
  const route = useRoute();
  const announcements = data.settings.announcements.filter((a) => a.active);

  return (
    <div className="lx-header">
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        {route.name === "music" && (
          <button
            className="lx-btn lx-btn-ghost lx-btn-sm"
            onClick={() => navigate({ name: "features" })}
            aria-label="Retour aux fonctionnalités"
          >
            <ChevronLeft size={16} /> Retour
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="lx-small lx-muted">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          {announcements.length > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              {announcements.slice(0, 2).map((a) => (
                <LxBadge key={a.id} tone={a.level === "warning" ? "warning" : "blue"}>
                  {a.title}
                </LxBadge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <UpdateBanner compact />
        <button className="lx-header-profile" onClick={() => navigate({ name: "account" })}>
          <div className="lx-avatar">{(user?.username ?? "?").slice(0, 1).toUpperCase()}</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13.5, fontWeight: 650 }}>{user?.username}</div>
            <div className="lx-small lx-muted">Mon compte</div>
          </div>
        </button>
      </div>
    </div>
  );
}

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

function PageSwitch() {
  const route = useRoute();
  switch (route.name) {
    case "dashboard":
      return <DashboardPage key="dashboard" />;
    case "features":
      return <FeaturesPage key="features" />;
    case "music":
      return <MusicPage key="music" />;
    case "trending":
      return <TrendingPage key="trending" />;
    case "history":
      return <HistoryPage key="history" />;
    case "account":
      return <AccountPage key="account" />;
    case "settings":
      return <SettingsPage key="settings" />;
    case "help":
      return <HelpPage key="help" />;
    default:
      return <DashboardPage key="dashboard-fallback" />;
  }
}

export function MainShell() {
  const { data } = useApp();

  return (
    <>
      <AmbientBackground />
      <div className="lx-titlebar">
        <ArrowDownToLine size={13} style={{ opacity: 0.4 }} aria-hidden />
        <span className="lx-titlebar-title">LuxenX</span>
        {data.error && (
          <span className="lx-small" style={{ color: "var(--lx-warning)", marginLeft: 8 }}>
            ⚠ synchronisation dégradée
          </span>
        )}
      </div>
      <div className="lx-shell">
        <Sidebar />
        <main className="lx-content">
          <div className="lx-content-narrow">
            <Header />
            <AnimatePresence mode="wait">
              <motion.div {...PAGE_TRANSITION}>
                <PageSwitch />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}
