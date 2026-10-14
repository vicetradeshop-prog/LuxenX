/**
 * Modale d'explication pour les cartes non disponibles.
 * Jamais de bouton mort : chaque carte verrouillée explique son état.
 */
import { motion } from "framer-motion";
import { CalendarClock, Wrench, PauseCircle, BellRing } from "lucide-react";
import type { FeatureCard } from "@luxenx/shared";
import { Illustration, LxButton, LxModal, useToast } from "@luxenx/ui";

export function LockedCardModal({
  card,
  open,
  onClose,
}: {
  card: FeatureCard | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!card) return null;

  const content = (() => {
    switch (card.status) {
      case "coming_soon":
        return {
          icon: <CalendarClock size={20} style={{ color: "var(--lx-violet-soft)" }} />,
          title: "Cette fonctionnalité arrive prochainement",
          body: `« ${card.title} » est en cours de préparation. Elle apparaîtra automatiquement dans LuxenX dès sa publication — aucune réinstallation ne sera nécessaire.`,
          cta: "M'avertir à sa sortie",
          onCta: () => {
            toast.push("success", `C'est noté ! Nous suivons « ${card.title} » pour vous.`);
            onClose();
          },
        };
      case "maintenance":
        return {
          icon: <Wrench size={20} style={{ color: "var(--lx-warning)" }} />,
          title: "Maintenance en cours",
          body: `« ${card.title} » est temporairement en maintenance pour garantir sa qualité. Elle sera de retour très bientôt.`,
          cta: "Compris",
          onCta: onClose,
        };
      case "disabled":
        return {
          icon: <PauseCircle size={20} style={{ color: "var(--lx-text-muted)" }} />,
          title: "Temporairement désactivée",
          body: `« ${card.title} » est momentanément désactivée par l'équipe LuxenX. Consultez le centre d'aide pour plus d'informations.`,
          cta: "Compris",
          onCta: onClose,
        };
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <LxModal open={open} onClose={onClose} width={520}>
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}
        >
          <div style={{ position: "relative" }}>
            <Illustration id={card.illustration} size={110} />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 16 }}
              style={{
                position: "absolute",
                bottom: -6,
                right: -14,
                width: 40,
                height: 40,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(16,16,28,0.9)",
                border: "1px solid var(--lx-border-strong)",
                boxShadow: "var(--lx-shadow-md)",
              }}
            >
              {content.icon}
            </motion.div>
          </div>
        </motion.div>

        <h3 className="lx-title-md" style={{ marginTop: 14 }}>
          {content.title}
        </h3>
        <p className="lx-subtitle" style={{ maxWidth: 400, margin: "10px auto 0", fontSize: 14.5 }}>
          {content.body}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 26 }}>
          <LxButton variant="ghost" onClick={onClose}>
            Fermer
          </LxButton>
          <LxButton onClick={content.onCta} icon={<BellRing size={15} />}>
            {content.cta}
          </LxButton>
        </div>
      </div>
    </LxModal>
  );
}
