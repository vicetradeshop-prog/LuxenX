/**
 * Tableau de bord administrateur — statistiques RÉELLES issues du backend.
 * États de chargement, états vides et erreurs explicites.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, LayoutGrid, Rocket, Database, Server } from "lucide-react";
import type { AdminStats } from "@luxenx/shared";
import { LxButton, LxBadge, LxPanel, LxSectionHeader, LxSpinner, ErrorIllustration, LxEmptyState } from "@luxenx/ui";
import { api } from "../lib/api.js";
import { useAdmin } from "../state/AdminState.js";

function StatCard({
  icon,
  label,
  value,
  sub,
  glow,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  glow: string;
  delay: number;
}) {
  return (
    <motion.div
      className="lx-glass lx-stat-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: glow,
          filter: "blur(34px)",
          opacity: 0.55,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        {icon}
        <span className="lx-stat-label">{label}</span>
      </div>
      <div className="lx-stat-value" style={{ position: "relative" }}>{value}</div>
      {sub && <div className="lx-small lx-muted" style={{ position: "relative" }}>{sub}</div>}
    </motion.div>
  );
}

export function DashboardAdminPage() {
  const { backendHealth, backendUrl } = useAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.adminStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="lx-page">
      <LxSectionHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble en temps réel de la plateforme LuxenX."
        action={
          <LxButton variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
            Actualiser
          </LxButton>
        }
      />

      {/* État du système */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <LxBadge tone={backendHealth?.status === "ok" ? "success" : "danger"}>
          <Server size={11} /> Backend : {backendHealth?.status ?? "…"}
        </LxBadge>
        <LxBadge tone={backendHealth?.redis === "ok" ? "success" : "warning"}>
          <Database size={11} /> Upstash Redis : {backendHealth?.redis ?? "…"}
        </LxBadge>
        <LxBadge tone="neutral">{backendUrl}</LxBadge>
        {backendHealth?.storage === "memory-volatile" && (
          <LxBadge tone="warning">Stockage mémoire volatile (configurez Upstash !)</LxBadge>
        )}
      </div>

      {loading && !stats && (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <LxSpinner size={26} />
        </div>
      )}

      {error && !stats && (
        <LxEmptyState
          illustration={<ErrorIllustration size={120} />}
          title="Statistiques indisponibles"
          description={error}
          action={<LxButton size="sm" onClick={() => void load()}>Réessayer</LxButton>}
        />
      )}

      {stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18, marginBottom: 26 }}>
            <StatCard icon={<Users size={15} style={{ color: "var(--lx-violet-soft)" }} />} label="Comptes" value={stats.totalUsers} sub={`${stats.activeUsers} actifs · ${stats.disabledUsers} désactivés`} glow="radial-gradient(circle, rgba(139,92,246,0.5), transparent 65%)" delay={0} />
            <StatCard icon={<UserPlus size={15} style={{ color: "var(--lx-cyan)" }} />} label="Nouveaux (7 jours)" value={stats.newUsersWeek} sub={`${stats.newUsersToday} aujourd'hui`} glow="radial-gradient(circle, rgba(56,189,248,0.4), transparent 65%)" delay={0.06} />
            <StatCard icon={<LayoutGrid size={15} style={{ color: "var(--lx-pink)" }} />} label="Cartes" value={stats.totalCards} sub={`${stats.availableCards} disponibles`} glow="radial-gradient(circle, rgba(244,114,182,0.4), transparent 65%)" delay={0.12} />
            <StatCard icon={<Rocket size={15} style={{ color: "var(--lx-success)" }} />} label="Dernière release" value={stats.latestRelease ? `v${stats.latestRelease.version}` : "—"} sub={stats.latestRelease ? new Date(stats.latestRelease.publishedAt).toLocaleDateString("fr-FR") : "aucune publication"} glow="radial-gradient(circle, rgba(52,211,153,0.4), transparent 65%)" delay={0.18} />
          </div>

          <LxPanel depth="glass" style={{ padding: 24 }}>
            <h3 className="lx-title-md" style={{ fontSize: 16, marginBottom: 14 }}>Dernières actions administratives</h3>
            {stats.recentAudit.length === 0 ? (
              <div className="lx-small lx-muted">Aucune action enregistrée pour l'instant.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.recentAudit.map((a) => (
                  <div key={a.id} className="lx-glass-flat" style={{ padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                    <LxBadge tone="violet">{a.action}</LxBadge>
                    <span className="lx-small" style={{ color: "var(--lx-text-secondary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.actorEmail}{a.target ? ` → ${a.target}` : ""}{a.details ? ` · ${a.details}` : ""}
                    </span>
                    <span className="lx-small lx-muted">{new Date(a.at).toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            )}
          </LxPanel>
        </>
      )}
    </div>
  );
}
