/**
 * Connexion administrateur dédiée.
 * Le serveur vérifie le rôle : un compte normal reçoit un refus explicite.
 */
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { ApiClientError } from "@luxenx/api-client";
import { LogoMark, LuxBuddy, LxButton, LxInput, LxPasswordInput, LxBadge, useToast } from "@luxenx/ui";
import { useAdmin } from "../state/AdminState.js";

export function LoginPage() {
  const { login, backendUrl, backendHealth, checkHealth } = useAdmin();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Renseignez votre adresse électronique et votre mot de passe.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.push("success", "Connexion administrateur réussie.");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.isNetworkError ? `Backend injoignable (${backendUrl}). Vérifiez l'adresse dans la configuration.` : err.message);
      } else {
        setError("Erreur inattendue lors de la connexion.");
      }
    } finally {
      setBusy(false);
    }
  }

  const healthOk = backendHealth?.status === "ok";

  return (
    <div className="lx-auth-wrap">
      <motion.div
        className="lx-glass-deep lx-auth-panel lx-page"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <LogoMark size={46} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 750 }}>
              LuxenX <span className="lx-gradient-text">Admin</span>
            </div>
            <div className="lx-small lx-muted">Console d'administration — accès restreint.</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
              <LuxBuddy size={52} />
            </motion.div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          <LxBadge tone={healthOk ? "success" : "danger"}>
            <ShieldCheck size={11} /> Backend {healthOk ? "opérationnel" : backendHealth ? `: ${backendHealth.status}` : "inconnu"}
          </LxBadge>
          <LxBadge tone="neutral">Redis : {backendHealth?.redis ?? "…"}</LxBadge>
          {backendHealth?.version && <LxBadge tone="blue">Backend v{backendHealth.version}</LxBadge>}
          <button className="lx-btn lx-btn-ghost lx-btn-sm" style={{ padding: "4px 10px" }} onClick={() => void checkHealth()}>
            Re-tester
          </button>
        </div>
        {!healthOk && (
          <div className="lx-glass-flat" style={{ padding: "10px 14px", marginBottom: 18, fontSize: 12.5, color: "var(--lx-text-secondary)", lineHeight: 1.6 }}>
            Backend injoignable à cette adresse. Deux causes possibles :
            <br />· backend local non démarré → lancez <strong>lancer.bat choix 4</strong> (ou 1) ;
            <br />· backend hébergé sur Render → vérifiez l'URL ci-dessous et que le service est éveillé.
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
          <LxInput
            label="Adresse électronique"
            type="email"
            value={email}
            autoComplete="username"
            placeholder="admin@votredomaine.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          <LxPasswordInput
            label="Mot de passe"
            value={password}
            autoComplete="current-password"
            placeholder="••••••••••"
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
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
              {error}
            </motion.div>
          )}

          <LxButton type="submit" size="lg" block loading={busy} style={{ marginTop: 4 }}>
            Ouvrir la console
          </LxButton>

          <p className="lx-small lx-muted" style={{ textAlign: "center", margin: 0, lineHeight: 1.6 }}>
            Le rôle administrateur est vérifié par le serveur à chaque requête.
            Premier compte admin : renseignez ADMIN_EMAIL / ADMIN_PASSWORD dans le
            fichier .env puis lancez le seed (voir README-FR.md, partie E).
          </p>
          <p className="lx-small lx-muted" style={{ textAlign: "center", margin: 0 }}>
            Backend : <code style={{ color: "var(--lx-text-secondary)" }}>{backendUrl}</code>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
