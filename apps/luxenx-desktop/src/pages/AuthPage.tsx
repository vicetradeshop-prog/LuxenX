/**
 * Écran de connexion / inscription / réinitialisation.
 * Composition sombre premium : panneau vitré, halots animés, champs
 * élégants, erreurs soignées, compagnon LuxenX en 2D.
 */
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ApiClientError } from "@luxenx/api-client";
import {
  AmbientBackground,
  LogoMark,
  LuxBuddy,
  LxButton,
  LxInput,
  LxPasswordInput,
  useToast,
} from "@luxenx/ui";
import { useApp } from "../state/AppState.js";
import { api } from "../lib/api.js";

type Mode = "login" | "register" | "forgot" | "reset";

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthPage() {
  const { login, register, phase } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>(phase === "anonymous" ? "login" : "login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setFormError(null);
    setInfo(null);
    setDevToken(null);
  }

  function clientValidate(): boolean {
    const errs: Record<string, string> = {};
    if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Adresse électronique invalide.";
    }
    if (mode === "register") {
      if (username.trim().length < 3) errs.username = "3 caractères minimum (lettres, chiffres, . _ -).";
      if (password.length < 10) errs.password = "10 caractères minimum pour un mot de passe robuste.";
      if (password !== confirm) errs.confirm = "Les mots de passe ne correspondent pas.";
    }
    if (mode === "reset" && password.length < 10) {
      errs.password = "10 caractères minimum.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function describe(err: unknown): string {
    if (err instanceof ApiClientError) {
      if (err.isNetworkError) {
        return "Impossible de joindre le serveur LuxenX. Vérifiez votre connexion ou l'adresse du backend dans les paramètres.";
      }
      if (err.status === 429) return err.message;
      return err.message;
    }
    return "Une erreur inattendue est survenue. Réessayez.";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    if (!clientValidate()) return;
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else if (mode === "register") {
        await register(email.trim(), username.trim(), password);
        toast.push("success", `Bienvenue dans LuxenX, ${username.trim()} !`);
      } else if (mode === "forgot") {
        const res = await api.forgotPassword(email.trim());
        setInfo(res.message);
        if (res.devToken) {
          // Mode développement sans serveur de courriel uniquement.
          setDevToken(res.devToken);
        }
        setMode("reset");
      } else if (mode === "reset") {
        const token = resetToken || devToken;
        if (!token) {
          setFormError("Jeton de réinitialisation manquant.");
          return;
        }
        const res = await api.resetPassword(token, password);
        setInfo(res.message);
        toast.push("success", "Mot de passe réinitialisé. Reconnectez-vous.");
        switchMode("login");
      }
    } catch (err) {
      setFormError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AmbientBackground />
      <div className="lx-auth-wrap">
        {/* Halo décoratif 2D */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 65%)",
            filter: "blur(30px)",
            top: "-12%",
            right: "-8%",
            pointerEvents: "none",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="lx-glass-deep lx-auth-panel lx-page"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <LogoMark size={46} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.01em" }}>
                Luxen<span className="lx-gradient-text">X</span>
              </div>
              <div className="lx-small lx-muted">Vos solutions informatiques, réunies.</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                <LuxBuddy size={54} />
              </motion.div>
            </div>
          </div>

          {(mode === "login" || mode === "register") && (
            <div className="lx-auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === "login"}
                className={`lx-auth-tab ${mode === "login" ? "lx-auth-tab-active" : ""}`}
                onClick={() => switchMode("login")}
                type="button"
              >
                Connexion
              </button>
              <button
                role="tab"
                aria-selected={mode === "register"}
                className={`lx-auth-tab ${mode === "register" ? "lx-auth-tab-active" : ""}`}
                onClick={() => switchMode("register")}
                type="button"
              >
                Créer un compte
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={onSubmit}
              initial={{ opacity: 0, x: mode === "register" ? 18 : -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "register" ? -18 : 18 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              noValidate
            >
              {mode === "reset" && info && (
                <div className="lx-glass-flat" style={{ padding: "12px 16px", fontSize: 13.5, color: "var(--lx-text-secondary)" }}>
                  {info}
                </div>
              )}

              {(mode === "login" || mode === "register" || mode === "forgot") && (
                <LxInput
                  label="Adresse électronique"
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
              )}

              {mode === "register" && (
                <LxInput
                  label="Nom d'utilisateur"
                  value={username}
                  autoComplete="username"
                  placeholder="ex. nova_42"
                  onChange={(e) => setUsername(e.target.value)}
                  error={errors.username}
                  hint="3 à 32 caractères : lettres, chiffres, . _ -"
                />
              )}

              {(mode === "login" || mode === "register" || mode === "reset") && (
                <LxPasswordInput
                  label="Mot de passe"
                  value={password}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  hint={mode !== "login" ? "10 caractères minimum" : undefined}
                />
              )}

              {mode === "register" && (
                <LxPasswordInput
                  label="Confirmez le mot de passe"
                  value={confirm}
                  autoComplete="new-password"
                  placeholder="••••••••••"
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                />
              )}

              {mode === "reset" && !devToken && (
                <LxInput
                  label="Jeton de réinitialisation"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Collez le jeton reçu"
                  hint="Envoyé par courriel si le service est configuré."
                />
              )}

              {mode === "reset" && devToken && (
                <div className="lx-glass-flat" style={{ padding: "10px 14px", fontSize: 12.5 }}>
                  <div className="lx-small lx-muted">Mode développement — jeton généré :</div>
                  <code style={{ color: "var(--lx-cyan)", wordBreak: "break-all" }}>{devToken}</code>
                </div>
              )}

              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lx-glass-flat"
                  role="alert"
                  style={{
                    padding: "12px 16px",
                    borderColor: "rgba(248,113,113,0.4)",
                    background: "rgba(248,113,113,0.08)",
                    color: "#fca5a5",
                    fontSize: 13.5,
                  }}
                >
                  {formError}
                </motion.div>
              )}

              <LxButton type="submit" size="lg" block loading={busy} style={{ marginTop: 6 }}>
                {mode === "login" && "Se connecter"}
                {mode === "register" && "Créer mon compte"}
                {mode === "forgot" && "Envoyer le lien"}
                {mode === "reset" && "Réinitialiser"}
              </LxButton>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                {mode === "login" && (
                  <button type="button" className="lx-btn lx-btn-ghost lx-btn-sm" onClick={() => switchMode("forgot")}>
                    Mot de passe oublié ?
                  </button>
                )}
                {(mode === "forgot" || mode === "reset") && (
                  <button type="button" className="lx-btn lx-btn-ghost lx-btn-sm" onClick={() => switchMode("login")}>
                    ← Retour à la connexion
                  </button>
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
