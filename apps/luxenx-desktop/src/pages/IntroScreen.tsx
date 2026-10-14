/**
 * Introduction animée — 100 % 2D (dégradés, lignes lumineuses,
 * particules simples, révélation de tracé). Aucune scène ni objet 3D.
 *
 * Scénario :
 *  Phase 1 — ouverture : fond noir profond, halos et lignes qui dérivent
 *  Phase 2 — identité : monogramme X tracé en SVG + nom LuxenX
 *  Phase 3 — transition : dispersion graphique des éléments
 *  Phase 4 — fondu vers l'écran suivant (connexion ou tableau de bord)
 *
 * Comportement : complète à la première utilisation, courte ensuite,
 * désactivable (Paramètres > Apparence), toujours esquissable.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuxBuddy } from "@luxenx/ui";
import { navigate } from "../lib/nav.js";
import { useApp } from "../state/AppState.js";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Particle {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

function useParticles(count: number): Particle[] {
  return useMemo(() => {
    const colors = ["#8b5cf6", "#4f7cff", "#38bdf8", "#f472b6", "#c4b5fd"];
    return Array.from({ length: count }, (_, i) => ({
      x: (i * 137.5) % 100,
      y: (i * 61.8) % 100,
      size: 2 + ((i * 7) % 4),
      delay: (i % 10) * 0.35,
      duration: 5 + ((i * 3) % 6),
      color: colors[i % colors.length] ?? "#8b5cf6",
    }));
  }, [count]);
}

export function IntroScreen() {
  const { phase, localSettings, updateLocalSettings } = useApp();
  const animationsOn = localSettings?.animationsEnabled !== false && !localSettings?.reduceMotion;
  const firstTime = !localSettings?.introSeen;
  const short = !firstTime;

  const particles = useParticles(animationsOn ? 26 : 0);

  // Durée des phases (version courte : ~40 % de la complète).
  const T = useMemo(
    () => (short ? { p1: 0.3, p2: 0.9, p3: 0.7, total: 2200 } : { p1: 0.8, p2: 1.6, p3: 1.1, total: 5600 }),
    [short],
  );

  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!animationsOn) {
      finish();
      return;
    }
    const timers = [
      setTimeout(() => setStage(1), T.p1 * 1000),
      setTimeout(() => setStage(2), (T.p1 + T.p2) * 1000),
      setTimeout(() => setStage(3), (T.p1 + T.p2 + T.p3) * 1000),
      setTimeout(() => finish(), T.total),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  async function finish() {
    if (firstTime) {
      await updateLocalSettings({ introSeen: true });
    }
    navigate({ name: phase === "authenticated" ? "dashboard" : "auth" });
  }

  return (
    <div className="lx-intro" role="presentation">
      {/* ---- Phase 1 : fond vivant (halos, lignes, particules 2D) ---- */}
      <motion.div
        aria-hidden
        style={{ position: "absolute", inset: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 || !animationsOn ? 1 : 0.35 }}
        transition={{ duration: 1.2 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 600px at 50% 42%, rgba(109,61,240,0.16), transparent 62%), radial-gradient(700px 500px at 78% 78%, rgba(56,189,248,0.1), transparent 60%), radial-gradient(600px 420px at 20% 24%, rgba(244,114,182,0.07), transparent 60%)",
          }}
        />
        {/* Lignes lumineuses qui dérivent lentement */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: "-20%",
              right: "-20%",
              top: `${24 + i * 22}%`,
              height: 1.5,
              background: `linear-gradient(90deg, transparent, ${
                ["rgba(139,92,246,0.55)", "rgba(79,124,255,0.45)", "rgba(56,189,248,0.4)"][i]
              }, transparent)`,
              filter: "blur(0.4px)",
            }}
            initial={{ opacity: 0, x: "-8%" }}
            animate={animationsOn ? { opacity: [0, 0.9, 0], x: ["-8%", "8%"] } : { opacity: 0.5 }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
          />
        ))}
        {/* Particules simples */}
        {particles.map((p, i) => (
          <motion.span
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.75, 0], y: [10, -18] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </motion.div>

      {/* ---- Phases 2-3 : identité puis dispersion ---- */}
      <AnimatePresence>
        {stage >= 1 && stage < 3 && (
          <motion.div
            key="identity"
            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.06,
              filter: "blur(10px)",
              transition: { duration: 0.7, ease: EASE },
            }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {/* Monogramme : tracé SVG animé (révélation progressive) */}
            <svg width="150" height="150" viewBox="0 0 120 120" fill="none" aria-hidden>
              <defs>
                <linearGradient id="intro-x" x1="20" y1="20" x2="100" y2="100">
                  <stop offset="0" stopColor="#c4b5fd" />
                  <stop offset="0.5" stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#4f7cff" />
                </linearGradient>
                <filter id="intro-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                d="M36 34 L52 34 L60 48 L68 34 L84 34 L68 60 L85 88 L69 88 L60 72 L51 88 L35 88 L52 60 Z"
                stroke="url(#intro-x)"
                strokeWidth="2.5"
                fill="none"
                filter="url(#intro-glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: short ? 0.7 : 1.5, ease: EASE }}
              />
              <motion.path
                d="M36 34 L52 34 L60 48 L68 34 L84 34 L68 60 L85 88 L69 88 L60 72 L51 88 L35 88 L52 60 Z"
                fill="url(#intro-x)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.92 }}
                transition={{ delay: short ? 0.5 : 1.2, duration: 0.8 }}
              />
            </svg>

            <motion.div
              style={{ textAlign: "center" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: short ? 0.45 : 1.0, duration: 0.8, ease: EASE }}
            >
              <div className="lx-intro-wordmark">
                Luxen<span className="lx-gradient-text">X</span>
              </div>
              <motion.div
                className="lx-muted"
                style={{ letterSpacing: "0.34em", textTransform: "uppercase", fontSize: 12, marginTop: 10 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: short ? 0.7 : 1.6, duration: 0.8 }}
              >
                Vos solutions informatiques
              </motion.div>
            </motion.div>

            {!short && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.9, duration: 0.9, ease: EASE }}
              >
                <LuxBuddy size={92} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Phase 4 : voile de transition vers l'écran suivant ---- */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(60% 60% at 50% 50%, rgba(139,92,246,0.22), transparent 70%)",
          pointerEvents: "none",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 3 ? [0, 1, 0] : 0 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />

      {/* Esquiver — toujours possible, jamais bloquant */}
      <motion.button
        className="lx-btn lx-btn-ghost lx-btn-sm lx-intro-skip"
        onClick={() => void finish()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Passer l'introduction →
      </motion.button>
    </div>
  );
}
