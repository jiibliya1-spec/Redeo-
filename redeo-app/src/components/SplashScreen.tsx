import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 2200);
    const t2 = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!exit && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-[#0A0A0C] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(255,107,0,0.12),transparent)]" />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex items-center gap-2.5 mb-8"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/25">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Wansni<span className="text-[#FF6B00]">Auto</span>
            </h1>
          </motion.div>

          {/* Main illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-[320px] sm:w-[380px]"
          >
            <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">

              {/* ── Road ── */}
              <ellipse cx="190" cy="240" rx="170" ry="18" fill="#1A1D24" />
              <rect x="20" y="232" width="340" height="14" rx="7" fill="#1E2130" />
              {/* road dashes */}
              <rect x="80" y="237" width="30" height="4" rx="2" fill="#FF6B00" opacity="0.4" />
              <rect x="175" y="237" width="30" height="4" rx="2" fill="#FF6B00" opacity="0.4" />
              <rect x="270" y="237" width="30" height="4" rx="2" fill="#FF6B00" opacity="0.4" />

              {/* ── Car body ── */}
              {/* Shadow */}
              <ellipse cx="190" cy="228" rx="95" ry="8" fill="rgba(0,0,0,0.35)" />
              {/* Main body */}
              <rect x="90" y="190" width="200" height="42" rx="10" fill="#FF6B00" />
              {/* Cabin */}
              <path d="M125 190 C128 165 152 155 190 155 C228 155 252 165 255 190Z" fill="#FF8533" />
              {/* Windows */}
              <path d="M138 188 C140 172 158 165 190 165 C222 165 240 172 242 188Z" fill="#0D1117" opacity="0.9" />
              <line x1="190" y1="165" x2="190" y2="188" stroke="#FF6B00" strokeWidth="2" opacity="0.6" />
              {/* Front bumper */}
              <rect x="274" y="205" width="20" height="14" rx="5" fill="#FF5500" />
              {/* Rear bumper */}
              <rect x="86" y="205" width="20" height="14" rx="5" fill="#FF5500" />
              {/* Headlight */}
              <rect x="278" y="196" width="12" height="7" rx="3" fill="#FFF9C4" />
              <rect x="278" y="196" width="12" height="7" rx="3" fill="rgba(255,240,100,0.6)" />
              {/* Taillight */}
              <rect x="90" y="196" width="10" height="7" rx="3" fill="#FF3333" opacity="0.9" />
              {/* Wheels */}
              <circle cx="145" cy="232" r="18" fill="#111520" />
              <circle cx="145" cy="232" r="11" fill="#1E2130" />
              <circle cx="145" cy="232" r="5" fill="#FF6B00" />
              <circle cx="235" cy="232" r="18" fill="#111520" />
              <circle cx="235" cy="232" r="11" fill="#1E2130" />
              <circle cx="235" cy="232" r="5" fill="#FF6B00" />
              {/* Door line */}
              <line x1="190" y1="192" x2="190" y2="230" stroke="#FF5500" strokeWidth="1.5" opacity="0.5" />

              {/* ── Left character (passenger) ── */}
              {/* Body */}
              <rect x="32" y="158" width="36" height="52" rx="10" fill="#3B82F6" />
              {/* Head */}
              <circle cx="50" cy="145" r="20" fill="#FBBF24" />
              {/* Hair */}
              <path d="M30 140 Q50 125 70 140 L70 135 Q50 118 30 135Z" fill="#78350F" />
              {/* Eyes */}
              <circle cx="43" cy="142" r="3" fill="#1E293B" />
              <circle cx="57" cy="142" r="3" fill="#1E293B" />
              <circle cx="44" cy="141" r="1" fill="white" />
              <circle cx="58" cy="141" r="1" fill="white" />
              {/* Big smile */}
              <path d="M42 150 Q50 158 58 150" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M43 151 Q50 157 57 151" fill="white" />
              {/* Raised arm toward handshake */}
              <path d="M68 170 L88 162" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
              {/* Other arm */}
              <path d="M32 175 L16 182" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
              {/* Legs */}
              <rect x="35" y="205" width="12" height="28" rx="6" fill="#1E3A8A" />
              <rect x="53" y="205" width="12" height="28" rx="6" fill="#1E3A8A" />
              {/* Shoes */}
              <ellipse cx="41" cy="234" rx="9" ry="5" fill="#111520" />
              <ellipse cx="59" cy="234" rx="9" ry="5" fill="#111520" />
              {/* Bag strap */}
              <path d="M32 168 Q24 180 26 195" stroke="#1D4ED8" strokeWidth="4" strokeLinecap="round" fill="none" />

              {/* ── Right character (driver) ── */}
              {/* Body */}
              <rect x="312" y="158" width="36" height="52" rx="10" fill="#FF6B00" />
              {/* Head */}
              <circle cx="330" cy="145" r="20" fill="#FBBF24" />
              {/* Hair */}
              <path d="M310 138 Q330 126 350 138 L348 133 Q330 120 312 133Z" fill="#374151" />
              {/* Eyes */}
              <circle cx="323" cy="142" r="3" fill="#1E293B" />
              <circle cx="337" cy="142" r="3" fill="#1E293B" />
              <circle cx="324" cy="141" r="1" fill="white" />
              <circle cx="338" cy="141" r="1" fill="white" />
              {/* Big smile */}
              <path d="M322 150 Q330 158 338 150" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M323 151 Q330 157 337 151" fill="white" />
              {/* Raised arm toward handshake */}
              <path d="M312 170 L292 162" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
              {/* Other arm */}
              <path d="M348 175 L364 182" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
              {/* Legs */}
              <rect x="315" y="205" width="12" height="28" rx="6" fill="#C2410C" />
              <rect x="333" y="205" width="12" height="28" rx="6" fill="#C2410C" />
              {/* Shoes */}
              <ellipse cx="321" cy="234" rx="9" ry="5" fill="#111520" />
              <ellipse cx="339" cy="234" rx="9" ry="5" fill="#111520" />
              {/* Keys in hand */}
              <circle cx="364" cy="183" r="5" fill="#FFD700" />
              <rect x="362" y="188" width="4" height="8" rx="1" fill="#FFD700" />

              {/* ── Handshake in the middle ── */}
              {/* Left hand */}
              <ellipse cx="178" cy="162" rx="16" ry="10" fill="#FBBF24" transform="rotate(-15 178 162)" />
              {/* Right hand */}
              <ellipse cx="202" cy="162" rx="16" ry="10" fill="#FBBF24" transform="rotate(15 202 162)" />
              {/* Overlap */}
              <ellipse cx="190" cy="162" rx="14" ry="9" fill="#F59E0B" />
              {/* Sparkles */}
              <text x="172" y="148" fontSize="14" fill="#FFD700" opacity="0.9">✦</text>
              <text x="195" y="143" fontSize="10" fill="#FFD700" opacity="0.7">✦</text>
              <text x="207" y="150" fontSize="12" fill="#FFD700" opacity="0.8">✦</text>

              {/* ── Stars / decorations ── */}
              <circle cx="55" cy="50" r="2" fill="#FF6B00" opacity="0.5" />
              <circle cx="320" cy="60" r="2.5" fill="#FF6B00" opacity="0.6" />
              <circle cx="190" cy="30" r="1.5" fill="white" opacity="0.4" />
              <circle cx="100" cy="80" r="1.5" fill="white" opacity="0.3" />
              <circle cx="280" cy="40" r="1.5" fill="white" opacity="0.3" />
            </svg>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="relative z-10 text-[11px] text-white/30 mt-2 tracking-[0.25em] uppercase"
          >
            Share the Road · Share the Journey
          </motion.p>

          {/* Progress bar */}
          <div className="relative z-10 w-28 mt-5">
            <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.2, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
