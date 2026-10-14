/**
 * Composants du design system LuxenX.
 * États réels pour chaque contrôle (normal, survol, pressé, désactivé,
 * chargement, succès/erreur). Animations 2D uniquement.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ */
/* Bouton                                                              */
/* ------------------------------------------------------------------ */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonFeedback = "none" | "success" | "error";

export interface LxButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  feedback?: ButtonFeedback;
  icon?: ReactNode;
}

export function LxButton({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  feedback = "none",
  icon,
  className = "",
  children,
  disabled,
  ...rest
}: LxButtonProps) {
  const classes = [
    "lx-btn",
    `lx-btn-${variant}`,
    size !== "md" ? `lx-btn-${size}` : "",
    block ? "lx-btn-block" : "",
    loading ? "lx-btn-loading" : "",
    feedback === "success" ? "lx-btn-success" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <span className="lx-btn-spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Champ de saisie                                                     */
/* ------------------------------------------------------------------ */

export interface LxInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  trailing?: ReactNode;
}

export function LxInput({ label, error, hint, trailing, className = "", id, ...rest }: LxInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="lx-field">
      {label && (
        <label className="lx-field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="lx-input-wrap">
        <input
          id={inputId}
          className={`lx-input ${error ? "lx-input-error" : ""} ${trailing ? "lx-input-has-trailing" : ""} ${className}`}
          style={trailing ? { paddingRight: 46 } : undefined}
          aria-invalid={!!error}
          {...rest}
        />
        {trailing && <span className="lx-input-icon">{trailing}</span>}
      </div>
      {error ? (
        <span className="lx-field-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.2v.2" />
          </svg>
          {error}
        </span>
      ) : hint ? (
        <span className="lx-small lx-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export function LxPasswordInput({ label, error, hint, ...rest }: LxInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <LxInput
      {...rest}
      label={label}
      error={error}
      hint={hint}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-3.76-3.77A3 3 0 1 1 10.6 9.9" />
              <path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.39-1.61M2 2l20 20" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      }
    />
  );
}

export interface LxTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export function LxTextarea({ label, error, className = "", id, ...rest }: LxTextareaProps) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className="lx-field">
      {label && (
        <label className="lx-field-label" htmlFor={tid}>
          {label}
        </label>
      )}
      <textarea id={tid} className={`lx-input ${error ? "lx-input-error" : ""} ${className}`} {...rest} />
      {error && <span className="lx-field-error">{error}</span>}
    </div>
  );
}

export interface LxSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function LxSelect({ label, options, className = "", id, ...rest }: LxSelectProps) {
  const autoId = useId();
  const sid = id ?? autoId;
  return (
    <div className="lx-field">
      {label && (
        <label className="lx-field-label" htmlFor={sid}>
          {label}
        </label>
      )}
      <select id={sid} className={`lx-input ${className}`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#10101c" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type BadgeTone =
  | "violet"
  | "blue"
  | "pink"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export function LxBadge({
  tone = "neutral",
  glow = false,
  children,
}: {
  tone?: BadgeTone;
  glow?: boolean;
  children: ReactNode;
}) {
  return <span className={`lx-badge lx-badge-${tone} ${glow ? "lx-badge-glow" : ""}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function LxToggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`lx-toggle ${checked ? "lx-toggle-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="lx-toggle-knob" />
    </button>
  );
}

export function LxSettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "16px 20px",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{title}</div>
        {description && (
          <div className="lx-small lx-muted" style={{ marginTop: 3, maxWidth: 460 }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

export function LxProgress({
  value,
  indeterminate = false,
}: {
  value?: number | null;
  indeterminate?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      className={`lx-progress ${indeterminate || value == null ? "lx-progress-indeterminate" : ""}`}
      role="progressbar"
      aria-valuenow={value == null ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="lx-progress-fill" style={{ width: value == null ? undefined : `${pct}%` }} />
    </div>
  );
}

export function LxSpinner({ size = 22 }: { size?: number }) {
  return <span className="lx-spinner" style={{ width: size, height: size }} aria-label="Chargement" />;
}

/* ------------------------------------------------------------------ */
/* Panneaux et titres                                                  */
/* ------------------------------------------------------------------ */

export function LxPanel({
  depth = "glass",
  className = "",
  style,
  children,
}: {
  depth?: "glass" | "deep" | "flat";
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const cls = depth === "deep" ? "lx-glass-deep" : depth === "flat" ? "lx-glass-flat" : "lx-glass";
  return (
    <div className={`${cls} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function LxSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        <h2 className="lx-title-lg">{title}</h2>
        {subtitle && <p className="lx-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* État vide                                                           */
/* ------------------------------------------------------------------ */

export function LxEmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="lx-glass-flat lx-empty-state">
      {illustration}
      <div className="lx-title-md">{title}</div>
      {description && (
        <p className="lx-muted" style={{ maxWidth: 420, margin: 0 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modale                                                              */
/* ------------------------------------------------------------------ */

export function LxModal({
  open,
  onClose,
  title,
  children,
  footer,
  width,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lx-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="lx-glass-deep lx-modal lx-page"
        style={width ? { width: Math.min(width, 720) } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && <h3 className="lx-title-md" style={{ marginBottom: 14 }}>{title}</h3>}
        {children}
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmations (opérations sensibles)                                */
/* ------------------------------------------------------------------ */

export function LxConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  danger = false,
  requireText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Texte à recopier pour débloquer la confirmation (opérations irréversibles). */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const blocked = !!requireText && typed !== requireText;

  return (
    <LxModal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <LxButton variant="ghost" onClick={onCancel}>
            Annuler
          </LxButton>
          <LxButton variant={danger ? "danger" : "primary"} disabled={blocked} onClick={onConfirm}>
            {confirmLabel}
          </LxButton>
        </>
      }
    >
      <div style={{ color: "var(--lx-text-secondary)", fontSize: 14.5 }}>{message}</div>
      {requireText && (
        <div style={{ marginTop: 16 }}>
          <LxInput
            label={`Recopiez « ${requireText} » pour confirmer`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireText}
            autoComplete="off"
          />
        </div>
      )}
    </LxModal>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastKind = "info" | "success" | "warning" | "error";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  push: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastCtx>({ push: () => undefined });

export function useToast(): ToastCtx {
  return useContext(ToastContext);
}

const TOAST_ICONS: Record<ToastKind, string> = {
  info: "var(--lx-info)",
  success: "var(--lx-success)",
  warning: "var(--lx-warning)",
  error: "var(--lx-danger)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    // Respecte le paramètre LuxenX « Notifications » (posé sur <body>).
    if (typeof document !== "undefined" && document.body.dataset.notifications === "off") return;
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  const ctx = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="lx-toast-zone" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="lx-glass-deep lx-toast lx-page">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: TOAST_ICONS[t.kind],
                boxShadow: `0 0 10px ${TOAST_ICONS[t.kind]}`,
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--lx-text-secondary)" }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Fond ambiant 2D                                                     */
/* ------------------------------------------------------------------ */

export function AmbientBackground({ grid = true }: { grid?: boolean }) {
  return (
    <>
      <div className="lx-ambient" aria-hidden />
      {grid && <div className="lx-ambient-grid" aria-hidden />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Garde d'erreur React : plus jamais d'écran noir muet                */
/* ------------------------------------------------------------------ */

import { Component } from "react";

export interface LxErrorBoundaryState {
  error: Error | null;
}

/**
 * Capture toute exception React et affiche un panneau lisible avec le
 * message d'erreur et l'emplacement des journaux, au lieu d'un écran vide.
 */
export class LxErrorBoundary extends Component<{ children: ReactNode }, LxErrorBoundaryState> {
  state: LxErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): LxErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    try {
      const w = window as unknown as {
        luxenx?: { debug?: { log: (m: string) => void } };
        luxadmin?: { debug?: { log: (m: string) => void } };
      };
      const log = w.luxenx?.debug?.log ?? w.luxadmin?.debug?.log;
      log?.(`Erreur React : ${error.message} | pile : ${(info.componentStack ?? "").slice(0, 400)}`);
    } catch {
      // ne jamais casser davantage
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="lx-glass-deep" style={{ maxWidth: 560, padding: 30 }}>
            <h2 className="lx-title-md" style={{ color: "var(--lx-danger)" }}>
              Une erreur inattendue s'est produite
            </h2>
            <p className="lx-subtitle" style={{ fontSize: 14 }}>
              L'application a été protégée par le garde d'erreur. Le détail a été
              enregistré dans les journaux (voir diagnostic.bat).
            </p>
            <pre
              style={{
                background: "rgba(0,0,0,0.45)",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 12.5,
                color: "var(--lx-text-secondary)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.message}
            </pre>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <LxButton onClick={() => window.location.reload()}>Recharger l'interface</LxButton>
              <LxButton variant="ghost" onClick={() => this.setState({ error: null })}>
                Réessayer sans recharger
              </LxButton>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
