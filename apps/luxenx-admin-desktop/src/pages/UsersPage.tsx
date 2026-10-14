/**
 * Gestion des comptes : liste paginée, recherche, filtres, profil,
 * désactivation/réactivation, révocation de sessions, suppression.
 * Toutes les opérations sensibles demandent confirmation.
 */
import { useCallback, useEffect, useState } from "react";
import { Search, Ban, CheckCircle2, KeyRound, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import type { SessionInfo, UserPublic } from "@luxenx/shared";
import {
  LxButton,
  LxBadge,
  LxInput,
  LxModal,
  LxPanel,
  LxSectionHeader,
  LxSelect,
  LxConfirmModal,
  LxSpinner,
  LxEmptyState,
  EmptyBoxIllustration,
  useToast,
} from "@luxenx/ui";
import { api } from "../lib/api.js";

const PAGE_SIZE = 12;

interface PendingAction {
  kind: "disable" | "enable" | "revoke" | "delete";
  user: UserPublic;
}

export function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<{ user: UserPublic; sessions: SessionInfo[] } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListUsers({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        role: role || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, role]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function runPending() {
    if (!pending) return;
    setBusy(true);
    try {
      const { kind, user } = pending;
      if (kind === "disable") {
        await api.adminUpdateUser(user.id, { status: "disabled" });
        toast.push("success", `Compte ${user.email} désactivé et sessions révoquées.`);
      } else if (kind === "enable") {
        await api.adminUpdateUser(user.id, { status: "active" });
        toast.push("success", `Compte ${user.email} réactivé.`);
      } else if (kind === "revoke") {
        const res = await api.adminRevokeUserSessions(user.id);
        toast.push("info", `${res.revoked} session(s) révoquée(s) pour ${user.email}.`);
      } else if (kind === "delete") {
        await api.adminDeleteUser(user.id);
        toast.push("success", `Compte ${user.email} supprimé.`);
      }
      setPending(null);
      setDetail(null);
      await load();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Opération refusée par le serveur.");
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(user: UserPublic) {
    try {
      setDetail(await api.adminGetUser(user.id));
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Profil inaccessible.");
    }
  }

  return (
    <div className="lx-page">
      <LxSectionHeader title="Comptes" subtitle={`${total} compte(s) — recherche, filtres et actions sécurisées.`} />

      <LxPanel depth="glass" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <LxInput
            placeholder="Rechercher par adresse ou pseudo…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            trailing={<Search size={16} />}
            aria-label="Recherche"
          />
          <LxSelect
            aria-label="Filtrer par état"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Tous les états" },
              { value: "active", label: "Actifs" },
              { value: "disabled", label: "Désactivés" },
              { value: "pending_verification", label: "En attente de vérification" },
            ]}
          />
          <LxSelect
            aria-label="Filtrer par rôle"
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Tous les rôles" },
              { value: "user", label: "Utilisateurs" },
              { value: "admin", label: "Administrateurs" },
            ]}
          />
        </div>
      </LxPanel>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <LxSpinner />
        </div>
      )}

      {error && !loading && (
        <LxEmptyState illustration={<EmptyBoxIllustration />} title="Liste indisponible" description={error} action={<LxButton size="sm" onClick={() => void load()}>Réessayer</LxButton>} />
      )}

      {!loading && !error && items.length === 0 && (
        <LxEmptyState illustration={<EmptyBoxIllustration />} title="Aucun compte ne correspond" description="Modifiez la recherche ou les filtres." />
      )}

      {!loading && !error && items.length > 0 && (
        <LxPanel depth="flat" style={{ padding: "6px 10px", overflowX: "auto" }}>
          <table className="lx-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Rôle</th>
                <th>État</th>
                <th>Créé le</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="lx-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                        {u.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: "var(--lx-text)", fontWeight: 600 }}>{u.username}</div>
                        <div className="lx-small lx-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><LxBadge tone={u.role === "admin" ? "violet" : "neutral"}>{u.role}</LxBadge></td>
                  <td>
                    <LxBadge tone={u.status === "active" ? "success" : u.status === "disabled" ? "danger" : "warning"}>
                      {u.status === "active" ? "actif" : u.status === "disabled" ? "désactivé" : "à vérifier"}
                    </LxBadge>
                  </td>
                  <td className="lx-small">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <LxButton variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => void openDetail(u)}>Profil</LxButton>
                      {u.status === "active" ? (
                        <LxButton variant="ghost" size="sm" icon={<Ban size={14} />} onClick={() => setPending({ kind: "disable", user: u })}>Désactiver</LxButton>
                      ) : (
                        <LxButton variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={() => setPending({ kind: "enable", user: u })}>Réactiver</LxButton>
                      )}
                      <LxButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setPending({ kind: "delete", user: u })} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="lx-pagination">
            <LxButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft size={14} />}>Précédent</LxButton>
            <span className="lx-small lx-muted">Page {page} / {pages}</span>
            <LxButton variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant<ChevronRight size={14} /></LxButton>
          </div>
        </LxPanel>
      )}

      {/* ---- Profil détaillé ---- */}
      <LxModal open={detail !== null} onClose={() => setDetail(null)} title="Profil du compte" width={560}>
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div className="lx-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                {detail.user.username.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{detail.user.username}</div>
                <div className="lx-small lx-muted">{detail.user.email}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <LxBadge tone={detail.user.role === "admin" ? "violet" : "neutral"}>{detail.user.role}</LxBadge>
                <LxBadge tone={detail.user.status === "active" ? "success" : "danger"}>{detail.user.status}</LxBadge>
              </div>
            </div>
            <div className="lx-glass-flat" style={{ padding: 14, fontSize: 13.5, lineHeight: 1.8 }}>
              <div><strong>Identifiant :</strong> <code>{detail.user.id}</code></div>
              <div><strong>Créé le :</strong> {new Date(detail.user.createdAt).toLocaleString("fr-FR")}</div>
              <div><strong>Dernière connexion :</strong> {detail.user.lastLoginAt ? new Date(detail.user.lastLoginAt).toLocaleString("fr-FR") : "jamais"}</div>
              <div><strong>Adresse vérifiée :</strong> {detail.user.emailVerified ? "oui" : "non"}</div>
              <div><strong>Mot de passe :</strong> haché Argon2id — jamais visible ni récupérable.</div>
            </div>
            <div>
              <div className="lx-small lx-muted" style={{ marginBottom: 8 }}>Sessions actives ({detail.sessions.length})</div>
              {detail.sessions.length === 0 && <div className="lx-small lx-muted">Aucune session.</div>}
              {detail.sessions.map((s) => (
                <div key={s.id} className="lx-glass-flat" style={{ padding: "8px 12px", marginBottom: 6, fontSize: 12.5 }}>
                  {new Date(s.createdAt).toLocaleString("fr-FR")} · expire {new Date(s.expiresAt).toLocaleDateString("fr-FR")} · {(s.userAgent ?? "").slice(0, 48)}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <LxButton variant="secondary" size="sm" icon={<KeyRound size={14} />} onClick={() => setPending({ kind: "revoke", user: detail.user })}>
                Révoquer toutes les sessions
              </LxButton>
              <LxButton variant="ghost" size="sm" onClick={() => setDetail(null)}>Fermer</LxButton>
            </div>
          </div>
        )}
      </LxModal>

      {/* ---- Confirmations ---- */}
      <LxConfirmModal
        open={pending !== null}
        title={
          pending?.kind === "delete"
            ? "Supprimer ce compte ?"
            : pending?.kind === "disable"
              ? "Désactiver ce compte ?"
              : pending?.kind === "revoke"
                ? "Révoquer les sessions ?"
                : "Réactiver ce compte ?"
        }
        danger={pending?.kind === "delete" || pending?.kind === "disable"}
        requireText={pending?.kind === "delete" ? "SUPPRIMER" : undefined}
        confirmLabel={busy ? "En cours…" : "Confirmer"}
        message={
          pending?.kind === "delete"
            ? `Le compte ${pending?.user.email ?? ""} et ses sessions seront définitivement supprimés. Cette opération est irréversible et sera journalisée.`
            : pending?.kind === "disable"
              ? `Le compte ${pending?.user.email ?? ""} sera désactivé : ses sessions seront révoquées et ses prochaines connexions refusées.`
              : pending?.kind === "revoke"
                ? `Toutes les sessions de ${pending?.user.email ?? ""} seront fermées. L'utilisateur devra se reconnecter.`
                : `Le compte ${pending?.user.email ?? ""} pourra de nouveau se connecter.`
        }
        onCancel={() => setPending(null)}
        onConfirm={() => void runPending()}
      />
    </div>
  );
}
