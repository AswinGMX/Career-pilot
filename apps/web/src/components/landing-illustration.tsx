export function LandingIllustration(): JSX.Element {
  return (
    <svg viewBox="0 0 480 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-svg-illustration">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cfc" />
          <stop offset="100%" stopColor="#5b3fd4" />
        </linearGradient>
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd19c" />
          <stop offset="100%" stopColor="#f0a853" />
        </linearGradient>
        <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d2b7a" />
          <stop offset="100%" stopColor="#2a1d5e" />
        </linearGradient>
        <linearGradient id="laptopGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d2066" />
          <stop offset="100%" stopColor="#1a1340" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1650" />
          <stop offset="100%" stopColor="#13102e" />
        </linearGradient>
        <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6344e0" />
          <stop offset="100%" stopColor="#5234c4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softShadow">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0a0720" floodOpacity="0.5" />
        </filter>
        <filter id="iconShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#0a0720" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Ambient glow behind character */}
      <circle cx="240" cy="195" r="100" fill="#7c5cfc" opacity="0.06" />
      <circle cx="240" cy="195" r="70" fill="#7c5cfc" opacity="0.04" />

      {/* ── Main character ── */}
      <g filter="url(#softShadow)">
        {/* Body / torso */}
        <path d="M200 225 C200 210, 210 200, 240 200 C270 200, 280 210, 280 225 L280 275 C280 280, 275 285, 270 285 L210 285 C205 285, 200 280, 200 275 Z" fill="url(#bodyGrad)" />
        {/* Collar detail */}
        <path d="M220 200 L240 215 L260 200" stroke="#a78bfa" strokeWidth="1.5" fill="none" opacity="0.5" />

        {/* Head */}
        <circle cx="240" cy="170" r="42" fill="url(#skinGrad)" />

        {/* Hair */}
        <path d="M198 158 C198 130, 215 115, 240 115 C265 115, 282 130, 282 158 C282 158, 275 135, 240 135 C205 135, 198 158, 198 158 Z" fill="url(#hairGrad)" />
        {/* Side hair */}
        <path d="M198 158 C196 165, 196 170, 198 175" stroke="#2a1d5e" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M282 158 C284 165, 284 170, 282 175" stroke="#2a1d5e" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Eyes */}
        <ellipse cx="225" cy="170" rx="4.5" ry="5" fill="#2a1d5e" />
        <ellipse cx="255" cy="170" rx="4.5" ry="5" fill="#2a1d5e" />
        <circle cx="226.5" cy="168.5" r="1.5" fill="#fff" />
        <circle cx="256.5" cy="168.5" r="1.5" fill="#fff" />

        {/* Eyebrows */}
        <path d="M218 162 C220 159, 228 158, 232 160" stroke="#2a1d5e" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M248 160 C252 158, 260 159, 262 162" stroke="#2a1d5e" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Nose */}
        <path d="M238 176 C239 178, 241 178, 242 176" stroke="#d4956a" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Mouth - friendly smile */}
        <path d="M228 184 C232 190, 248 190, 252 184" stroke="#c4865a" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Glasses */}
        <circle cx="225" cy="170" r="12" stroke="#a78bfa" strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx="255" cy="170" r="12" stroke="#a78bfa" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M237 170 L243 170" stroke="#a78bfa" strokeWidth="1.5" opacity="0.6" />
        <path d="M213 168 L198 164" stroke="#a78bfa" strokeWidth="1.5" opacity="0.4" />
        <path d="M267 168 L282 164" stroke="#a78bfa" strokeWidth="1.5" opacity="0.4" />

        {/* Graduation cap */}
        <polygon points="205,140 240,125 275,140 240,152" fill="#2a1d5e" />
        <polygon points="205,140 240,125 275,140 240,152" fill="#3d2b7a" opacity="0.6" />
        <rect x="238" y="112" width="4" height="13" rx="2" fill="#2a1d5e" />
        <circle cx="240" cy="110" r="5" fill="#a78bfa" />
        {/* Tassel */}
        <path d="M275 140 L280 140 L278 155" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="278" cy="157" r="3" fill="#a78bfa" />
      </g>

      {/* ── Laptop ── */}
      <g filter="url(#softShadow)">
        {/* Base */}
        <rect x="180" y="290" width="120" height="7" rx="3.5" fill="#3d2b7a" />
        {/* Screen back */}
        <rect x="190" y="255" width="100" height="65" rx="6" fill="url(#laptopGrad)" />
        {/* Screen */}
        <rect x="195" y="260" width="90" height="50" rx="3" fill="url(#screenGrad)" />
        {/* Code lines on screen */}
        <rect x="202" y="268" width="38" height="3" rx="1.5" fill="#7c5cfc" opacity="0.8" />
        <rect x="202" y="275" width="55" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.35" />
        <rect x="202" y="281" width="45" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.25" />
        <rect x="202" y="287" width="52" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.2" />
        <rect x="202" y="293" width="35" height="2.5" rx="1.25" fill="#7c5cfc" opacity="0.3" />
        {/* Cursor blink */}
        <rect x="242" y="268" width="2" height="3" rx="0.5" fill="#a78bfa" opacity="0.8" />
      </g>

      {/* ── Floating elements ── */}

      {/* Top-left: Document/notes card */}
      <g filter="url(#iconShadow)" transform="translate(65, 95)">
        <rect width="56" height="44" rx="10" fill="url(#cardGrad)" />
        <rect x="10" y="10" width="36" height="3.5" rx="1.75" fill="#a78bfa" opacity="0.8" />
        <rect x="10" y="17" width="28" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.5" />
        <rect x="10" y="23" width="32" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.4" />
        <rect x="10" y="29" width="20" height="2.5" rx="1.25" fill="#a78bfa" opacity="0.3" />
      </g>

      {/* Top-right: Analytics chart */}
      <g filter="url(#iconShadow)" transform="translate(350, 80)">
        <rect width="60" height="48" rx="10" fill="url(#cardGrad)" />
        {/* Bar chart */}
        <rect x="12" y="28" width="7" height="12" rx="2" fill="#a78bfa" opacity="0.7" />
        <rect x="22" y="20" width="7" height="20" rx="2" fill="#7c5cfc" />
        <rect x="32" y="14" width="7" height="26" rx="2" fill="#a78bfa" opacity="0.8" />
        <rect x="42" y="22" width="7" height="18" rx="2" fill="#a78bfa" opacity="0.8" />
        {/* Trend line */}
        <path d="M15 32 L25 24 L35 18 L45 26" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />
      </g>

      {/* Right: Achievement star */}
      <g filter="url(#iconShadow)" transform="translate(370, 195)">
        <circle r="24" cx="24" cy="24" fill="#6344e0" />
        <circle r="18" cx="24" cy="24" fill="#7c5cfc" opacity="0.5" />
        <path d="M24 10 L27.5 19 L37 19 L29.5 25 L32 34 L24 28.5 L16 34 L18.5 25 L11 19 L20.5 19 Z" fill="#a78bfa" />
      </g>

      {/* Left: Certificate */}
      <g filter="url(#iconShadow)" transform="translate(55, 215)">
        <rect width="50" height="40" rx="8" fill="url(#cardGrad)" />
        <rect x="10" y="8" width="30" height="3" rx="1.5" fill="#a78bfa" opacity="0.7" />
        <rect x="14" y="14" width="22" height="2" rx="1" fill="#a78bfa" opacity="0.4" />
        <rect x="14" y="19" width="22" height="2" rx="1" fill="#a78bfa" opacity="0.3" />
        <circle cx="25" cy="30" r="6" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
        <path d="M25 26 L26 29 L29 29 L27 31 L28 34 L25 32 L22 34 L23 31 L21 29 L24 29 Z" fill="#a78bfa" opacity="0.8" />
      </g>

      {/* Bottom-right: Rocket */}
      <g filter="url(#iconShadow)" transform="translate(360, 295)">
        <rect width="44" height="44" rx="12" fill="url(#cardGrad)" />
        <text x="22" y="29" textAnchor="middle" fontSize="20" dominantBaseline="central">🚀</text>
      </g>

      {/* Bottom-left: Lightbulb idea */}
      <g filter="url(#iconShadow)" transform="translate(85, 310)">
        <rect width="44" height="44" rx="12" fill="url(#cardGrad)" />
        <text x="22" y="29" textAnchor="middle" fontSize="20" dominantBaseline="central">💡</text>
      </g>

      {/* ── Sparkles & decorative dots ── */}
      {/* Cross sparkle top */}
      <g transform="translate(165, 85)" opacity="0.5">
        <rect x="4" y="0" width="2" height="10" rx="1" fill="#a78bfa" />
        <rect x="0" y="4" width="10" height="2" rx="1" fill="#a78bfa" />
      </g>
      {/* Cross sparkle right */}
      <g transform="translate(340, 155)" opacity="0.4">
        <rect x="3" y="0" width="1.5" height="8" rx="0.75" fill="#a78bfa" />
        <rect x="0" y="3" width="8" height="1.5" rx="0.75" fill="#a78bfa" />
      </g>
      {/* Small dots */}
      <circle cx="130" cy="135" r="2" fill="#a78bfa" opacity="0.4" />
      <circle cx="340" cy="260" r="2" fill="#a78bfa" opacity="0.3" />
      <circle cx="150" cy="290" r="1.5" fill="#a78bfa" opacity="0.4" />
      <circle cx="320" cy="130" r="1.5" fill="#a78bfa" opacity="0.3" />
      {/* Diamond sparkle */}
      <g transform="translate(310, 70)" opacity="0.35">
        <path d="M5 0 L7 5 L5 10 L3 5 Z" fill="#a78bfa" />
      </g>
      <g transform="translate(120, 240)" opacity="0.3">
        <path d="M4 0 L6 4 L4 8 L2 4 Z" fill="#a78bfa" />
      </g>
    </svg>
  );
}
