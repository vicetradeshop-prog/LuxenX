/**
 * Mon compte : profil, session, préférences, informations de version.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, MonitorSmartphone, Trash2, UserRound } from "lucide-react";
import type { SessionInfo } from "@luxenx/shared";
import {
  LxButton,
  LxInput,
  LxPanel,
  LxSectionHeader,
  LxBadge,
  LxConfirmModal,
  LuxBuddy,
  useToast,
} from "@luxenx/ui";
import { useApp } from "../state/AppState.js";
import { navigate } from "../lib/nav.js";
import { api } from "../lib/api.js";

export function AccountPage() {
  const { user, appInfo, logout, setUser } = useApp();
  const toast = useToast();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [username, setUsername] = useState(user?.username ?? "");
  const [savingName, setSavingName] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  void pwdBusy;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const acc = await api.getAccount();
        setSessions(acc.sessions);
        setUsername(acc.user.username);
      } catch {
        // hors ligne : le profil local reste affiché
      }
    })();
  }, []);

  async function saveUsername() {
    setSavingName(true);
    try {
      const updated = await api.updateAccount({ username: username.trim() });
      setUser(updated);
      toast.push("success", "Nom d'utilisateur mis à jour.");
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    setPwdBusy(true);
    try {
      await api.changePassword(currentPwd, newPwd);
      toast.push("success", "Mot de passe modifié. Les autres sessions ont été déconnectées.");
      setPwdOpen(false);
      setCurrentPwd("");
      setNewPwd("");
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Changement impossible.");
    } finally {
      setPwdBusy(false);
    }
  }

  async function revokeSession(id: string) {
    await api.revokeSession(id);
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.push("info", "Session révoquée.");
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      await api.deleteAccount(deletePwd);
      toast.push("info", "Votre compte a été supprimé.");
      await logout();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="lx-page">
      <LxSectionHeader title="Mon compte" subtitle="Profil, sessions actives et sécurité." />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Profil */}
          <LxPanel depth="deep" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div className="lx-avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
                {(user?.username ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="lx-title-md">{user?.username}</div>
                <div className="lx-small lx-muted">{user?.email}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <LxBadge tone={user?.role === "admin" ? "violet" : "blue"}>
                    {user?.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </LxBadge>
                  <LxBadge tone={user?.status === "active" ? "success" : "warning"}>
                    {user?.status === "active" ? "Compte actif" : user?.status}
                  </LxBadge>
                </div>
              </div>
            </div>

            <hr className="lx-divider" />

            <div className="lx-small lx-muted" style={{ marginBottom: 8 }}>
              Membre depuis le {user ? new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <LxInput label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <LxButton
                variant="secondary"
                loading={savingName}
                disabled={username.trim() === user?.username}
                onClick={() => void saveUsername()}
              >
                Enregistrer
              </LxButton>
            </div>
          </LxPanel>

          {/* Sécurité */}
          <LxPanel depth="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <KeyRound size={17} style={{ color: "var(--lx-violet-soft)" }} />
              <h3 className="lx-title-md" style={{ fontSize: 16 }}>Sécurité</h3>
            </div>
            <p className="lx-small lx-muted" style={{ marginBottom: 14 }}>
              Votre mot de passe est haché côté serveur (Argon2id) et n'est jamais stocké sur cet ordinateur.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <LxButton variant="secondary" size="sm" onClick={() => setPwdOpen(true)}>
                Changer le mot de passe
              </LxButton>
              <LxButton variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>
                Supprimer mon compte
              </LxButton>
            </div>
          </LxPanel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Sessions */}
          <LxPanel depth="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <MonitorSmartphone size={17} style={{ color: "var(--lx-cyan)" }} />
              <h3 className="lx-title-md" style={{ fontSize: 16 }}>Sessions actives</h3>
            </div>
            {sessions.length === 0 ? (
              <div className="lx-small lx-muted">Aucune autre session enregistrée.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sessions.map((s) => (
                  <div key={s.id} className="lx-glass-flat" style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="lx-small" style={{ fontWeight: 600 }}>
                        {s.current ? "Cet appareil (session actuelle)" : s.userAgent?.slice(0, 40) || "Session"}
                      </span>
                      {s.current && <LxBadge tone="success">ACTIVE</LxBadge>}
                    </div>
                    <div className="lx-small lx-muted" style={{ marginTop: 2 }}>
                      Créée le {new Date(s.createdAt).toLocaleDateString("fr-FR")} · expire le{" "}
                      {new Date(s.expiresAt).toLocaleDateString("fr-FR")}
                    </div>
                    {!s.current && (
                      <LxButton variant="ghost" size="sm" style={{ marginTop: 6, padding: "4px 10px" }} onClick={() => void revokeSession(s.id)}>
                        Révoquer
                      </LxButton>
                    )}
                  </div>
                ))}
              </div>
            )}
          </LxPanel>

          {/* Version */}
          <LxPanel depth="flat" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <LuxBuddy size={54} />
              </motion.div>
              <div>
                <div className="lx-title-md" style={{ fontSize: 15 }}>LuxenX {appInfo?.version ?? ""}</div>
                <div className="lx-small lx-muted">
                  Vos identifiants de session sont protégés sur cet ordinateur.
                </div>
                <div className="lx-small lx-muted" style={{ marginTop: 2 }}>
                  Mises à jour : gérées automatiquement par le service.
                </div>
              </div>
            </div>
          </LxPanel>

          <LxPanel depth="flat" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserRound size={16} style={{ color: "var(--lx-text-muted)" }} />
              <span className="lx-small lx-muted">
                Les préférences d'interface (animations, notifications, dossier de téléchargement)
                se règlent dans <LxButton variant="ghost" size="sm" style={{ padding: "2px 8px" }} onClick={() => navigate({ name: "settings" })}>Paramètres</LxButton>.
              </span>
            </div>
          </LxPanel>
        </div>
      </div>

      {/* Modale changement de mot de passe */}
      <LxConfirmModal
        open={pwdOpen}
        title="Changer le mot de passe"
        message={
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <LxInput label="Mot de passe actuel" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            <LxInput label="Nouveau mot de passe (10 caractères minimum)" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
        }
        confirmLabel="Modifier"
        onCancel={() => setPwdOpen(false)}
        onConfirm={() => void changePassword()}
      />

      {/* Modale suppression de compte */}
      <LxConfirmModal
        open={deleteOpen}
        title="Supprimer définitivement mon compte"
        danger
        requireText="SUPPRIMER"
        confirmLabel={deleteBusy ? "Suppression…" : "Supprimer mon compte"}
        message={
          <div>
            <p style={{ marginBottom: 14 }}>
              Cette opération est <strong>irréversible</strong> : compte, préférences et sessions seront effacés du
              serveur. Les fichiers déjà téléchargés sur votre ordinateur sont conservés.
            </p>
            <LxInput
              label="Votre mot de passe (confirmation)"
              type="password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
            />
          </div>
        }
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
