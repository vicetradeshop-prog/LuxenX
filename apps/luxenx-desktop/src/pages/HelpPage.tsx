/**
 * Centre d'aide — FAQ et guides illustrés.
 * Le contenu provient du serveur (administrable depuis LuxenX Admin sans
 * recompiler l'application) avec repli sur le contenu embarqué.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LifeBuoy, Mail, MessageCircle } from "lucide-react";
import type { Guide } from "@luxenx/shared";
import {
  Illustration,
  LxBadge,
  LxButton,
  LxPanel,
  LxSectionHeader,
  HelpIllustration,
  useToast,
} from "@luxenx/ui";
import { useApp } from "../state/AppState.js";

export function HelpPage() {
  const { data } = useApp();
  const toast = useToast();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<Guide | null>(null);

  const faq = data.help.faq;
  const guides = data.help.guides;

  return (
    <div className="lx-page">
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 30 }}>
        <div style={{ flex: 1 }}>
          <LxSectionHeader
            title="Centre d'aide"
            subtitle="Questions fréquentes et guides illustrés, mis à jour à distance par l'équipe LuxenX."
          />
        </div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <HelpIllustration size={130} />
        </motion.div>
      </div>

      {/* ---- Guides ---- */}
      <h3 className="lx-title-md" style={{ marginBottom: 14 }}>Guides illustrés</h3>
      <div className="lx-card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginBottom: 36 }}>
        {guides.length === 0 && (
          <div className="lx-small lx-muted">
            Les guides sont chargés depuis le serveur. Vérifiez la connexion au backend.
          </div>
        )}
        {guides.map((g, i) => (
          <motion.button
            key={g.id}
            className="lx-glass lx-feature-card lx-card-accent-violet"
            style={{ minHeight: 200, textAlign: "left", fontFamily: "inherit", color: "inherit" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -5 }}
            onClick={() => setOpenGuide(g)}
          >
            <div className="lx-feature-card-illustration" style={{ width: 66, height: 66, borderRadius: 20 }}>
              <Illustration id={g.illustration} size={48} />
            </div>
            <div style={{ marginTop: "auto" }}>
              <div className="lx-title-md" style={{ fontSize: 15.5 }}>{g.title}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <LxBadge tone="neutral">{g.category}</LxBadge>
                <LxBadge tone="violet">{g.steps.length} étapes</LxBadge>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ---- FAQ ---- */}
      <h3 className="lx-title-md" style={{ marginBottom: 14 }}>Questions fréquentes</h3>
      <LxPanel depth="glass" style={{ padding: "8px 24px", marginBottom: 36 }}>
        {faq.length === 0 && (
          <div className="lx-small lx-muted" style={{ padding: "16px 0" }}>
            La FAQ est chargée depuis le serveur LuxenX.
          </div>
        )}
        {faq.map((f) => {
          const open = openFaq === f.id;
          return (
            <div key={f.id} className="lx-faq-item">
              <button
                className="lx-faq-question"
                onClick={() => setOpenFaq(open ? null : f.id)}
                aria-expanded={open}
              >
                {f.question}
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown size={17} style={{ color: "var(--lx-violet-soft)" }} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="lx-faq-answer">{f.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </LxPanel>

      {/* ---- Contact ---- */}
      <LxPanel depth="deep" style={{ padding: 28, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ flexShrink: 0 }}>
          <LifeBuoy size={40} style={{ color: "var(--lx-violet-soft)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="lx-title-md">Besoin d'un coup de main ?</h3>
          <p className="lx-subtitle" style={{ fontSize: 14 }}>
            Décrivez votre problème avec la version de LuxenX (Paramètres › À propos) et le message
            d'erreur exact : l'assistance répond plus vite avec ces informations.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <LxButton
            variant="secondary"
            size="sm"
            icon={<Mail size={14} />}
            onClick={() => {
              void window.luxenx.shell
                .openExternal("https://github.com/")
                .catch(() => toast.push("info", "Ouvrez votre navigateur et contactez l'assistance LuxenX."));
            }}
          >
            Contacter l'assistance
          </LxButton>
          <LxButton variant="ghost" size="sm" icon={<MessageCircle size={14} />} onClick={() => toast.push("info", "Les guides ci-dessus répondent à la plupart des questions !")}>
            Parcourir les guides
          </LxButton>
        </div>
      </LxPanel>

      {/* ---- Modale guide ---- */}
      <AnimatePresence>
        {openGuide && (
          <motion.div
            className="lx-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && setOpenGuide(null)}
          >
            <motion.div
              className="lx-glass-deep lx-modal"
              style={{ width: "min(640px, 100%)" }}
              initial={{ scale: 0.94, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              role="dialog"
              aria-modal="true"
              aria-label={openGuide.title}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <div className="lx-feature-card-illustration" style={{ width: 60, height: 60, borderRadius: 18 }}>
                  <Illustration id={openGuide.illustration} size={42} />
                </div>
                <div>
                  <h3 className="lx-title-md">{openGuide.title}</h3>
                  <LxBadge tone="violet">{openGuide.category}</LxBadge>
                </div>
                <LxButton variant="ghost" size="sm" style={{ marginLeft: "auto" }} onClick={() => setOpenGuide(null)}>
                  Fermer ✕
                </LxButton>
              </div>
              <hr className="lx-divider" />
              {openGuide.steps.map((step, i) => (
                <motion.div
                  key={i}
                  className="lx-guide-step"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.35 }}
                >
                  <div className="lx-guide-step-number">{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 14.5 }}>{step.title}</div>
                    <div className="lx-small" style={{ color: "var(--lx-text-secondary)", marginTop: 3, lineHeight: 1.6 }}>
                      {step.body}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
