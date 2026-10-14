/**
 * Illustrations vectorielles 2D originales de LuxenX.
 * Style : cartoon premium technologique — formes arrondies, dégradés
 * maîtrisés, reflets subtils, contours propres. AUCUN objet 3D :
 * la profondeur vient uniquement des dégradés, ombres et superpositions 2D.
 */
import type { JSX } from "react";
import type { IllustrationId } from "@luxenx/shared";

type IllProps = { size?: number; className?: string };

const uid = (prefix: string) => `${prefix}-lx`;

/* ------------------------------------------------------------------ */
/* Logo LuxenX : monogramme "X" lumineux dans un halo violet/bleu      */
/* ------------------------------------------------------------------ */

export function LogoMark({ size = 64, className }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} role="img" aria-label="Logo LuxenX">
      <defs>
        <linearGradient id={uid("logo-bg")} x1="0" y1="0" x2="120" y2="120">
          <stop offset="0" stopColor="#1a1030" />
          <stop offset="1" stopColor="#0a0a14" />
        </linearGradient>
        <linearGradient id={uid("logo-x")} x1="20" y1="20" x2="100" y2="100">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4f7cff" />
        </linearGradient>
        <radialGradient id={uid("logo-glow")} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx="30" fill={uid("logo-bg").replace(/^/, "url(#") + ")"} stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
      <circle cx="60" cy="54" r="46" fill={`url(#${uid("logo-glow")})`} />
      <path
        d="M36 34 L52 34 L60 48 L68 34 L84 34 L68 60 L85 88 L69 88 L60 72 L51 88 L35 88 L52 60 Z"
        fill={`url(#${uid("logo-x")})`}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="30" r="4" fill="#38bdf8" opacity="0.9" />
      <circle cx="30" cy="90" r="3" fill="#f472b6" opacity="0.8" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Personnages et objets cartoon                                       */
/* ------------------------------------------------------------------ */

/** Petit compagnon LuxenX : orbe lumineux avec visage amical. */
export function LuxBuddy({ size = 120, className }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className} role="img" aria-label="Compagnon LuxenX">
      <defs>
        <radialGradient id={uid("buddy-body")} cx="0.4" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#b39dfa" />
          <stop offset="0.55" stopColor="#7c4fe0" />
          <stop offset="1" stopColor="#3b2a86" />
        </radialGradient>
        <radialGradient id={uid("buddy-shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="142" rx="42" ry="9" fill={`url(#${uid("buddy-shadow")})`} />
      <circle cx="80" cy="78" r="52" fill={`url(#${uid("buddy-body")})`} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <ellipse cx="62" cy="52" rx="20" ry="12" fill="rgba(255,255,255,0.28)" transform="rotate(-18 62 52)" />
      <circle cx="64" cy="80" r="7.5" fill="#0d0b1a" />
      <circle cx="96" cy="80" r="7.5" fill="#0d0b1a" />
      <circle cx="66.5" cy="77.5" r="2.6" fill="#fff" />
      <circle cx="98.5" cy="77.5" r="2.6" fill="#fff" />
      <path d="M70 98 Q80 106 90 98" stroke="#0d0b1a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="94" r="5" fill="#f472b6" opacity="0.45" />
      <circle cx="110" cy="94" r="5" fill="#f472b6" opacity="0.45" />
      <path d="M80 18 L84 26 L80 24 L76 26 Z" fill="#38bdf8" />
      <circle cx="128" cy="40" r="3.5" fill="#c4b5fd" />
      <circle cx="30" cy="120" r="2.8" fill="#38bdf8" />
    </svg>
  );
}

function MusicIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Script musique">
      <defs>
        <linearGradient id={uid("mus-disc")} x1="30" y1="30" x2="130" y2="130">
          <stop offset="0" stopColor="#2a1a4d" />
          <stop offset="1" stopColor="#0d0a1c" />
        </linearGradient>
        <linearGradient id={uid("mus-note")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="84" r="54" fill={`url(#${uid("mus-disc")})`} stroke="rgba(139,92,246,0.5)" strokeWidth="2.5" />
      <circle cx="80" cy="84" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx="80" cy="84" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      <circle cx="80" cy="84" r="12" fill="#8b5cf6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <circle cx="80" cy="84" r="4" fill="#0d0a1c" />
      <ellipse cx="60" cy="56" rx="18" ry="9" fill="rgba(255,255,255,0.14)" transform="rotate(-24 60 56)" />
      <g>
        <path d="M118 34 L118 62" stroke={`url(#${uid("mus-note")})`} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="112" cy="64" rx="8" ry="6.5" fill="#a78bfa" transform="rotate(-14 112 64)" />
        <path d="M118 34 q12 3 14 12 q-6 -4 -14 -3 Z" fill="#38bdf8" />
      </g>
      <circle cx="34" cy="42" r="4" fill="#f472b6" opacity="0.85" />
      <circle cx="26" cy="112" r="3" fill="#38bdf8" opacity="0.8" />
      <path d="M136 108 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#c4b5fd" opacity="0.9" />
    </svg>
  );
}

function CloudIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Cloud">
      <defs>
        <linearGradient id={uid("cl-body")} x1="30" y1="50" x2="130" y2="120">
          <stop offset="0" stopColor="#3b5bd6" />
          <stop offset="1" stopColor="#1c2a63" />
        </linearGradient>
      </defs>
      <path
        d="M52 112 a24 24 0 0 1 -2 -47 a30 30 0 0 1 57 -8 a22 22 0 0 1 4 55 Z"
        fill={`url(#${uid("cl-body")})`}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2.5"
      />
      <ellipse cx="66" cy="72" rx="16" ry="8" fill="rgba(255,255,255,0.22)" transform="rotate(-12 66 72)" />
      <circle cx="70" cy="92" r="4.5" fill="#0d1230" />
      <circle cx="94" cy="92" r="4.5" fill="#0d1230" />
      <circle cx="71.5" cy="90.5" r="1.6" fill="#fff" />
      <circle cx="95.5" cy="90.5" r="1.6" fill="#fff" />
      <path d="M76 102 Q82 107 88 102" stroke="#0d1230" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 40 v14 m0 0 l-5 -5 m5 5 l5 -5" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="46" r="3.5" fill="#c4b5fd" />
    </svg>
  );
}

function ShieldIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Sécurité">
      <defs>
        <linearGradient id={uid("sh-body")} x1="50" y1="26" x2="115" y2="130">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0f5c46" />
        </linearGradient>
      </defs>
      <path
        d="M80 22 L126 40 V82 C126 110 104 128 80 138 C56 128 34 110 34 82 V40 Z"
        fill={`url(#${uid("sh-body")})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M58 78 L74 94 L104 58" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="62" cy="48" rx="14" ry="7" fill="rgba(255,255,255,0.3)" transform="rotate(-24 62 48)" />
      <circle cx="132" cy="34" r="3.5" fill="#34d399" />
      <circle cx="28" cy="112" r="3" fill="#c4b5fd" />
    </svg>
  );
}

function RocketIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Performance">
      <defs>
        <linearGradient id={uid("rk-body")} x1="60" y1="20" x2="100" y2="120">
          <stop offset="0" stopColor="#f2f0fa" />
          <stop offset="1" stopColor="#9f9bc0" />
        </linearGradient>
        <linearGradient id={uid("rk-flame")} x1="80" y1="110" x2="80" y2="150">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.6" stopColor="#f472b6" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M80 120 C80 120 66 128 60 142 L80 134 L100 142 C94 128 80 120 80 120 Z" fill={`url(#${uid("rk-flame")})`} />
      <ellipse cx="80" cy="146" rx="16" ry="5" fill="#fbbf24" opacity="0.35" />
      <path d="M56 96 L44 116 L60 108 Z" fill="#4f7cff" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M104 96 L116 116 L100 108 Z" fill="#4f7cff" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path
        d="M80 16 C98 34 106 60 104 90 L96 112 H64 L56 90 C54 60 62 34 80 16 Z"
        fill={`url(#${uid("rk-body")})`}
        stroke="rgba(13,10,26,0.4)"
        strokeWidth="2"
      />
      <circle cx="80" cy="58" r="14" fill="#0d0a1c" stroke="#8b5cf6" strokeWidth="3.5" />
      <circle cx="75" cy="53" r="4" fill="#38bdf8" opacity="0.9" />
      <path d="M80 16 C88 24 93 33 96 43 C90 36 82 32 74 33 C76 27 78 21 80 16 Z" fill="#f472b6" />
      <circle cx="34" cy="40" r="3" fill="#38bdf8" />
      <circle cx="128" cy="66" r="2.6" fill="#f472b6" />
    </svg>
  );
}

function TerminalIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Terminal">
      <defs>
        <linearGradient id={uid("tm-body")} x1="24" y1="34" x2="136" y2="126">
          <stop offset="0" stopColor="#1d1d30" />
          <stop offset="1" stopColor="#0c0c16" />
        </linearGradient>
      </defs>
      <rect x="22" y="32" width="116" height="96" rx="16" fill={`url(#${uid("tm-body")})`} stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
      <rect x="22" y="32" width="116" height="22" rx="11" fill="rgba(255,255,255,0.06)" />
      <circle cx="38" cy="43" r="4" fill="#f87171" />
      <circle cx="52" cy="43" r="4" fill="#fbbf24" />
      <circle cx="66" cy="43" r="4" fill="#34d399" />
      <path d="M40 74 L52 84 L40 94" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M62 96 H92" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
      <rect x="98" y="80" width="10" height="18" rx="2" fill="#c4b5fd" opacity="0.9" />
    </svg>
  );
}

function NetworkIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Réseau">
      <defs>
        <radialGradient id={uid("nw-core")} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#1d4ed8" />
        </radialGradient>
      </defs>
      <path d="M80 60 V36 M80 100 V124 M60 80 H36 M100 80 H124 M66 66 L48 48 M94 94 L112 112 M94 66 L112 48 M66 94 L48 112" stroke="rgba(139,92,246,0.55)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="80" r="24" fill={`url(#${uid("nw-core")})`} stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <circle cx="72" cy="74" r="4" fill="rgba(255,255,255,0.5)" />
      <circle cx="36" cy="36" r="9" fill="#8b5cf6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="124" cy="36" r="9" fill="#f472b6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="36" cy="124" r="9" fill="#38bdf8" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="124" cy="124" r="9" fill="#c4b5fd" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    </svg>
  );
}

function DriveIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Stockage">
      <defs>
        <linearGradient id={uid("dr-body")} x1="30" y1="40" x2="130" y2="120">
          <stop offset="0" stopColor="#31314d" />
          <stop offset="1" stopColor="#14141f" />
        </linearGradient>
      </defs>
      <rect x="28" y="46" width="104" height="30" rx="12" fill={`url(#${uid("dr-body")})`} stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
      <rect x="28" y="86" width="104" height="30" rx="12" fill={`url(#${uid("dr-body")})`} stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
      <circle cx="46" cy="61" r="5" fill="#34d399" />
      <circle cx="46" cy="101" r="5" fill="#8b5cf6" />
      <rect x="100" y="56" width="20" height="10" rx="4" fill="rgba(255,255,255,0.14)" />
      <rect x="100" y="96" width="20" height="10" rx="4" fill="rgba(255,255,255,0.14)" />
      <path d="M80 16 v18 m0 0 l-7 -7 m7 7 l7 -7" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M64 30 h32" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Nouveauté">
      <defs>
        <linearGradient id={uid("sp-a")} x1="50" y1="30" x2="110" y2="130">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M80 20 L92 62 L134 74 L92 86 L80 130 L68 86 L26 74 L68 62 Z" fill={`url(#${uid("sp-a")})`} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M126 24 L131 40 L147 45 L131 50 L126 66 L121 50 L105 45 L121 40 Z" fill="#38bdf8" opacity="0.95" />
      <path d="M34 104 L38 116 L50 120 L38 124 L34 136 L30 124 L18 120 L30 116 Z" fill="#fbbf24" opacity="0.9" />
    </svg>
  );
}

function ToolsIllustration({ size = 120 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Outils">
      <defs>
        <linearGradient id={uid("tl-metal")} x1="40" y1="30" x2="120" y2="130">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M104 30 a24 24 0 0 0 -20 37 L44 107 a10 10 0 0 0 0 14 l8 8 a10 10 0 0 0 14 0 l40 -40 a24 24 0 0 0 30 -33 l-14 14 -14 -3 -3 -14 Z" fill={`url(#${uid("tl-metal")})`} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="112" cy="52" r="6" fill="#8b5cf6" />
      <path d="M36 36 l10 10 m0 -10 l-10 10" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="128" cy="112" r="4" fill="#38bdf8" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* États : vide, succès, erreur, aide                                  */
/* ------------------------------------------------------------------ */

export function EmptyBoxIllustration({ size = 140 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Aucun élément">
      <defs>
        <linearGradient id={uid("eb-box")} x1="40" y1="60" x2="120" y2="130">
          <stop offset="0" stopColor="#26263c" />
          <stop offset="1" stopColor="#131320" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="140" rx="46" ry="8" fill="rgba(0,0,0,0.45)" />
      <path d="M36 76 L80 56 L124 76 L124 122 L80 142 L36 122 Z" fill={`url(#${uid("eb-box")})`} stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 76 L80 96 L124 76 M80 96 V142" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" />
      <circle cx="66" cy="106" r="4" fill="#84809a" />
      <circle cx="94" cy="106" r="4" fill="#84809a" />
      <path d="M70 120 Q80 114 90 120" stroke="#84809a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 34 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#c4b5fd" opacity="0.85" />
      <circle cx="38" cy="44" r="3" fill="#38bdf8" opacity="0.7" />
    </svg>
  );
}

export function SuccessIllustration({ size = 140 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Succès">
      <defs>
        <radialGradient id={uid("sc-glow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="64" fill={`url(#${uid("sc-glow")})`} />
      <circle cx="80" cy="80" r="46" fill="#0e2b21" stroke="#34d399" strokeWidth="4" />
      <path d="M58 80 L73 95 L103 62" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M126 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#fbbf24" />
      <circle cx="34" cy="52" r="4" fill="#34d399" />
      <circle cx="122" cy="118" r="3" fill="#c4b5fd" />
    </svg>
  );
}

export function ErrorIllustration({ size = 140 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Erreur">
      <defs>
        <radialGradient id={uid("er-glow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f87171" stopOpacity="0.3" />
          <stop offset="1" stopColor="#f87171" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="64" fill={`url(#${uid("er-glow")})`} />
      <circle cx="80" cy="80" r="46" fill="#2b1114" stroke="#f87171" strokeWidth="4" />
      <circle cx="66" cy="72" r="4.5" fill="#fca5a5" />
      <circle cx="94" cy="72" r="4.5" fill="#fca5a5" />
      <path d="M64 98 Q80 88 96 98" stroke="#fca5a5" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M118 34 l10 10 m0 -10 l-10 10" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="120" r="3.5" fill="#fbbf24" />
    </svg>
  );
}

export function HelpIllustration({ size = 140 }: IllProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label="Aide">
      <defs>
        <linearGradient id={uid("hp-body")} x1="40" y1="36" x2="120" y2="120">
          <stop offset="0" stopColor="#4f7cff" />
          <stop offset="1" stopColor="#2b1a6e" />
        </linearGradient>
      </defs>
      <path d="M34 48 a14 14 0 0 1 14 -14 h64 a14 14 0 0 1 14 14 v44 a14 14 0 0 1 -14 14 H74 l-20 18 v-18 h-6 a14 14 0 0 1 -14 -14 Z" fill={`url(#${uid("hp-body")})`} stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 62 a12 12 0 1 1 17 11 c-4 2 -5 4 -5 8" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <circle cx="80" cy="92" r="3.6" fill="#fff" />
      <circle cx="128" cy="36" r="3.5" fill="#38bdf8" />
      <path d="M26 108 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#f472b6" opacity="0.9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Registre des illustrations de cartes                                */
/* ------------------------------------------------------------------ */

const REGISTRY: Record<IllustrationId, (p: IllProps) => JSX.Element> = {
  music: MusicIllustration,
  cloud: CloudIllustration,
  shield: ShieldIllustration,
  rocket: RocketIllustration,
  terminal: TerminalIllustration,
  network: NetworkIllustration,
  drive: DriveIllustration,
  sparkle: SparkleIllustration,
  tools: ToolsIllustration,
};

export function Illustration({ id, size = 120 }: { id: IllustrationId; size?: number }): JSX.Element {
  const Cmp = REGISTRY[id] ?? SparkleIllustration;
  return <Cmp size={size} />;
}

export const ILLUSTRATION_COMPONENTS = REGISTRY;
