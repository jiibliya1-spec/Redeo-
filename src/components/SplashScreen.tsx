import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ═══════════════════════════════════════════
   CINEMATIC PREMIUM SPLASH SCREEN
   WansniAuto - Black / Orange / White
   ═══════════════════════════════════════════ */

/* ─── Letter-by-letter reveal component ─── */
function LetterReveal({
  text,
  startDelay = 0,
  className = '',
  letterClassName = '',
}: {
  text: string;
  startDelay?: number;
  className?: string;
  letterClassName?: string;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.45,
            delay: startDelay + i * 0.07,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`inline-block ${letterClassName}`}
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Modern Car SVG (lightweight, animated) ─── */
function ModernCar({
  scale = 1,
  className = '',
}: {
  scale?: number;
  className?: string;
}) {
  return (
    <motion.svg
      viewBox="0 0 280 90"
      className={className}
      style={{ width: 280 * scale, height: 90 * scale }}
    >
      {/* Car body shadow */}
      <ellipse
        cx="140"
        cy="82"
        rx="110"
        ry="6"
        fill="rgba(255,107,0,0.08)"
      />

      {/* Headlight beam */}
      <motion.path
        d="M260 50 L340 35 L340 70 Z"
        fill="url(#headlightGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.3, 0.5, 0] }}
        transition={{ duration: 0.15, delay: 2.8 }}
      />

      {/* Car body - main shape */}
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#1A1A1E" />
          <stop offset="40%" stopColor="#25252A" />
          <stop offset="70%" stopColor="#1E1E22" />
          <stop offset="100%" stopColor="#151518" />
        </linearGradient>
        <linearGradient id="windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0D0D10" />
          <stop offset="100%" stopColor="#1A1A1E" />
        </linearGradient>
        <linearGradient id="headlightGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="rgba(255,200,100,0.5)" />
          <stop offset="100%" stopColor="rgba(255,200,100,0)" />
        </linearGradient>
        <linearGradient id="taillightGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="rgba(255,60,0,0.6)" />
          <stop offset="100%" stopColor="rgba(255,60,0,0)" />
        </linearGradient>
      </defs>

      {/* Rear wheel well */}
      <ellipse cx="65" cy="68" rx="22" ry="14" fill="#0A0A0C" />
      {/* Front wheel well */}
      <ellipse cx="210" cy="68" rx="22" ry="14" fill="#0A0A0C" />

      {/* Main body */}
      <path
        d="M20 62 Q15 55 22 48 L55 38 Q70 20 110 18 L175 16 Q210 18 230 30 L265 42 Q272 48 268 58 Q265 65 255 66 L25 66 Q18 65 20 62Z"
        fill="url(#bodyGrad)"
        stroke="rgba(255,107,0,0.15)"
        strokeWidth="0.5"
      />

      {/* Side window - rear */}
      <path
        d="M72 28 L105 24 L105 40 L68 42Z"
        fill="url(#windowGrad)"
        stroke="rgba(255,107,0,0.1)"
        strokeWidth="0.5"
      />
      {/* Side window - front */}
      <path
        d="M115 23 L165 20 L195 38 L115 40Z"
        fill="url(#windowGrad)"
        stroke="rgba(255,107,0,0.1)"
        strokeWidth="0.5"
      />

      {/* Window divider */}
      <line x1="110" y1="22" x2="110" y2="41" stroke="rgba(255,107,0,0.15)" strokeWidth="1.5" />

      {/* Orange accent line on body */}
      <motion.path
        d="M22 55 L268 52"
        stroke="#FF6B00"
        strokeWidth="0.8"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 1.5, delay: 1.5, ease: 'easeInOut' }}
      />

      {/* Headlight - front */}
      <motion.ellipse
        cx="263"
        cy="50"
        rx="5"
        ry="7"
        fill="#FFE4B5"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.2, 0.9, 0.6, 0.9, 0.4] }}
        transition={{ duration: 0.2, delay: 2.6 }}
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,200,100,0.6))' }}
      />

      {/* Taillight - rear */}
      <motion.ellipse
        cx="18"
        cy="52"
        rx="3"
        ry="6"
        fill="#FF3C00"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 2, duration: 0.5 }}
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,60,0,0.5))' }}
      />

      {/* Wheels */}
      <g>
        {/* Rear wheel */}
        <circle cx="65" cy="68" r="14" fill="#0D0D0F" stroke="#1E1E22" strokeWidth="2" />
        <circle cx="65" cy="68" r="9" fill="#151518" stroke="#FF6B00" strokeWidth="0.8" opacity="0.6" />
        {/* Rear rim lines */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <motion.line
            key={`rw-${angle}`}
            x1="65"
            y1="68"
            x2={65 + 7 * Math.cos((angle * Math.PI) / 180)}
            y2={68 + 7 * Math.sin((angle * Math.PI) / 180)}
            stroke="rgba(255,107,0,0.3)"
            strokeWidth="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '65px 68px' }}
          />
        ))}

        {/* Front wheel */}
        <circle cx="210" cy="68" r="14" fill="#0D0D0F" stroke="#1E1E22" strokeWidth="2" />
        <circle cx="210" cy="68" r="9" fill="#151518" stroke="#FF6B00" strokeWidth="0.8" opacity="0.6" />
        {/* Front rim lines */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <motion.line
            key={`fw-${angle}`}
            x1="210"
            y1="68"
            x2={210 + 7 * Math.cos((angle * Math.PI) / 180)}
            y2={68 + 7 * Math.sin((angle * Math.PI) / 180)}
            stroke="rgba(255,107,0,0.3)"
            strokeWidth="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '210px 68px' }}
          />
        ))}
      </g>

      {/* Door handle */}
      <rect x="125" y="45" width="10" height="2" rx="1" fill="rgba(255,107,0,0.3)" />
      <rect x="160" y="44" width="10" height="2" rx="1" fill="rgba(255,107,0,0.3)" />

      {/* Side mirror */}
      <ellipse cx="118" cy="38" rx="5" ry="3" fill="#1A1A1E" stroke="rgba(255,107,0,0.1)" strokeWidth="0.5" />
    </motion.svg>
  );
}

/* ─── Animated Road Component ─── */
function AnimatedRoad({ phase }: { phase: string }) {
  const lines = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 0.18,
      duration: 1.2 + Math.random() * 0.4,
      width: 40 + Math.random() * 80,
      top: 42 + Math.random() * 16,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-[22%] h-20 overflow-hidden pointer-events-none">
      {/* Road surface gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#FF6B00]/[0.02] to-transparent" />

      {/* Moving light streaks */}
      {lines.map((line) => (
        <motion.div
          key={line.id}
          className="absolute h-[1.5px] rounded-full"
          style={{
            top: `${line.top}%`,
            width: line.width,
            background: `linear-gradient(90deg, transparent, rgba(255,107,0,${line.opacity}), rgba(255,140,50,${line.opacity * 0.7}), transparent)`,
            boxShadow: `0 0 8px rgba(255,107,0,${line.opacity * 0.5}), 0 0 20px rgba(255,107,0,${line.opacity * 0.2})`,
          }}
          initial={{ x: '110vw', opacity: 0 }}
          animate={
            phase === 'drive' || phase === 'reveal'
              ? { x: '-20vw', opacity: [0, 1, 1, 0] }
              : { x: '110vw', opacity: 0 }
          }
          transition={{
            duration: line.duration,
            delay: line.delay,
            repeat: phase === 'drive' || phase === 'reveal' ? Infinity : 0,
            ease: 'linear',
          }}
        />
      ))}

      {/* Center road line (perspective) */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-full"
        style={{
          background:
            'linear-gradient(to top, rgba(255,107,0,0.15), rgba(255,107,0,0.05), transparent)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />

      {/* Road edge glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,107,0,0.2), rgba(255,107,0,0.4), rgba(255,107,0,0.2), transparent)',
          boxShadow: '0 0 30px rgba(255,107,0,0.15)',
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      />
    </div>
  );
}

/* ─── Floating Particles ─── */
function Particles({ count = 20 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 60 + Math.random() * 40,
      size: 1 + Math.random() * 3,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      opacity: 0.1 + Math.random() * 0.4,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background:
              p.id % 3 === 0
                ? 'rgba(255,107,0,0.6)'
                : p.id % 3 === 1
                  ? 'rgba(255,200,150,0.4)'
                  : 'rgba(255,255,255,0.3)',
            boxShadow: `0 0 ${p.size * 3}px ${p.id % 3 === 0 ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, p.opacity, p.opacity * 0.5, 0],
            y: [0, -30 - Math.random() * 60, -60 - Math.random() * 100],
            x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60],
            scale: [0, 1, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SPLASH SCREEN
   ═══════════════════════════════════════════ */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'glow' | 'drive' | 'reveal' | 'exit'>('glow');
  const controls = useAnimation();

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('drive'), 800),    // 0.8s: road + car
      setTimeout(() => setPhase('reveal'), 2200),  // 2.2s: logo + letters
      setTimeout(() => setPhase('exit'), 3800),    // 3.8s: fade out
      setTimeout(() => onComplete(), 4200),        // 4.2s: app ready
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Pre-render: don't show anything until fonts/styles ready
  const [ready, setReady] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* ═══ BACKGROUND LAYERS ═══ */}

          {/* Deep black base */}
          <div className="absolute inset-0 bg-[#050505]" />

          {/* Subtle vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }}
          />

          {/* Orange ambient glow (pulsing) */}
          <motion.div
            className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,107,0,0.08) 0%, rgba(255,80,0,0.03) 40%, transparent 70%)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: phase === 'glow' ? [0, 0.6, 0.3] : 0.4,
              scale: phase === 'glow' ? [0.5, 1.2, 1] : 1,
            }}
            transition={{
              duration: 2,
              ease: 'easeOut',
            }}
          />

          {/* Secondary warm glow behind road */}
          <motion.div
            className="absolute left-1/2 bottom-[15%] -translate-x-1/2 w-[800px] h-[200px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse, rgba(255,107,0,0.06) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'drive' || phase === 'reveal' ? 1 : 0 }}
            transition={{ duration: 1 }}
          />

          {/* Particles layer */}
          <Particles count={18} />

          {/* ═══ ROAD + LIGHT STREAKS ═══ */}
          <AnimatedRoad phase={phase} />

          {/* ═══ CAMERA-LIKE SUBTLE ZOOM (cinematic) ═══ */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center w-full h-full"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ duration: 3.5, ease: 'easeOut' }}
          >
            {/* ═══ CAR ENTRANCE ═══ */}
            <motion.div
              className="relative z-20 mb-6"
              initial={{ x: '70vw', opacity: 0, scale: 0.6 }}
              animate={{
                x:
                  phase === 'glow'
                    ? '70vw'
                    : phase === 'drive'
                      ? 0
                      : phase === 'reveal'
                        ? 0
                        : '-70vw',
                opacity: phase === 'glow' ? 0 : phase === 'exit' ? 0 : 1,
                scale: phase === 'glow' ? 0.6 : 1,
              }}
              transition={{
                x: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.6 },
                scale: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              {/* Car subtle bob animation */}
              <motion.div
                animate={
                  phase === 'drive' || phase === 'reveal'
                    ? { y: [0, -1.5, 0] }
                    : { y: 0 }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <ModernCar scale={1.1} className="drop-shadow-2xl" />
              </motion.div>

              {/* Car underglow */}
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-6 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(255,107,0,0.15) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: phase === 'drive' || phase === 'reveal' ? 1 : 0,
                }}
                transition={{ delay: 1.5, duration: 0.8 }}
              />
            </motion.div>

            {/* ═══ WANSNIAUTO LETTER-BY-LETTER ═══ */}
            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{
                opacity: phase === 'reveal' || phase === 'exit' ? 1 : 0,
              }}
              transition={{ duration: 0.5 }}
            >
              {/* Main brand name */}
              <div className="flex items-baseline justify-center">
                <LetterReveal
                  text="WANSNI"
                  startDelay={2.4}
                  className="text-3xl sm:text-5xl font-black tracking-[0.15em]"
                  letterClassName="text-white"
                />
                <LetterReveal
                  text="AUTO"
                  startDelay={2.4 + 6 * 0.07}
                  className="text-3xl sm:text-5xl font-black tracking-[0.15em]"
                  letterClassName="text-[#FF6B00]"
                />
              </div>

              {/* Neon glow behind text */}
              <motion.div
                className="absolute inset-0 -z-10 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: phase === 'reveal' ? [0, 0.3, 0.15] : 0,
                }}
                transition={{ delay: 2.6, duration: 1.5 }}
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255,107,0,0.15) 0%, transparent 60%)',
                  filter: 'blur(20px)',
                }}
              />

              {/* Tagline letter-by-letter */}
              <div className="mt-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: phase === 'reveal' ? 1 : 0,
                    y: phase === 'reveal' ? 0 : 10,
                  }}
                  transition={{ delay: 3.0, duration: 0.6, ease: 'easeOut' }}
                >
                  <LetterReveal
                    text="PREMIUM RIDESHARE"
                    startDelay={3.0}
                    className="text-[10px] sm:text-xs font-medium tracking-[0.4em]"
                    letterClassName="text-white/40"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* ═══ PROGRESS BAR ═══ */}
            <motion.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 sm:w-56"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'drive' || phase === 'reveal' ? 1 : 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {/* Track */}
              <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                {/* Fill */}
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, #FF6B00, #FF8533, #FF6B00)',
                    boxShadow: '0 0 8px rgba(255,107,0,0.4)',
                  }}
                  initial={{ width: '0%' }}
                  animate={{
                    width:
                      phase === 'drive'
                        ? '60%'
                        : phase === 'reveal'
                          ? '100%'
                          : '0%',
                  }}
                  transition={{
                    duration: phase === 'reveal' ? 1.2 : 2,
                    ease: 'easeOut',
                  }}
                />
              </div>

              {/* Percentage text */}
              <motion.p
                className="text-center text-[9px] text-white/20 mt-2 tracking-[0.2em] font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'reveal' ? 0.6 : 0.3 }}
                transition={{ duration: 0.3 }}
              >
                {phase === 'drive' ? 'LOADING' : phase === 'reveal' ? 'READY' : ''}
              </motion.p>
            </motion.div>
          </motion.div>

          {/* ═══ TOP & BOTTOM GRADIENT FADES ═══ */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none z-30" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
