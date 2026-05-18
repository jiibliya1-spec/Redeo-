import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ─── Animated road lines ─── */
function AnimatedRoad() {
  return (
    <div className="relative w-full h-16 mt-4 overflow-hidden">
      <div className="absolute bottom-0 w-full h-10 bg-gradient-to-b from-[#1a1a2e]/60 to-transparent border-t border-white/[0.04]">
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex gap-4">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 900 + i * 50 }}
              animate={{ x: -300 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1, ease: 'linear' }}
              className="w-6 h-[2px] bg-[#FF6B00]/20 rounded-full shrink-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Speed lines for motion feel ─── */
function SpeedLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 600, opacity: 0 }}
          animate={{ x: -400, opacity: [0, 0.12, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 + 0.15, ease: 'linear' }}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ top: `${20 + (i % 8) * 9}%`, width: `${60 + i * 18}px` }}
        />
      ))}
    </div>
  );
}

/* ─── Light streaks ─── */
function LightStreaks() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: -300, opacity: [0, 0.06, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.45 + 0.5, ease: 'linear' }}
          className="absolute h-8 bg-gradient-to-r from-transparent via-[#FF6B00]/10 to-transparent rounded-full blur-xl"
          style={{ top: `${30 + i * 12}%`, width: '120px' }}
        />
      ))}
    </div>
  );
}

/* ─── Real Mercedes Car ─── */
function RealMercedes({ isDriving = true }: { isDriving?: boolean }) {
  return (
    <motion.div
      initial={{ x: '60vw', opacity: 0, scale: 0.9 }}
      animate={{ x: '-140vw', opacity: [0, 1, 1, 1, 0] }}
      transition={{
        x: { duration: 5, ease: 'linear' },
        opacity: { duration: 5, times: [0, 0.06, 0.9, 0.97, 1] },
        scale: { duration: 0.8 },
      }}
      className="relative"
    >
      <motion.div
        animate={isDriving ? { y: [-2, 1.5, -2] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* Glow/shadow under the car */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-[#FF6B00]/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 rounded-full blur-xl" />

        {/* The real Mercedes image */}
        <img
          src="/images/mercedes-splash.jpg"
          alt="Mercedes-Benz"
          className="w-[420px] sm:w-[520px] h-auto object-contain drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))' }}
        />

        {/* Headlight glow (front of car - right side of image since it's rear 3/4 view) */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-[35%] right-[5%] w-6 h-4 bg-blue-300/40 rounded-full blur-lg"
        />

        {/* Taillight glow */}
        <motion.div
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute top-[32%] left-[8%] w-8 h-5 bg-red-500/50 rounded-full blur-md"
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Splash Screen ─── */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'driving' | 'exit'>('intro');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('driving'), 150);
    const t2 = setTimeout(() => setPhase('exit'), 4800);
    const t3 = setTimeout(() => onComplete(), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 1.8));
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'exit' || progress < 100 ? (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-[#0A0A0C] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Dark gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0D0D10] to-[#0A0A0C]" />

          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

          {/* Motion effects */}
          <SpeedLines />
          <LightStreaks />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center w-full">
            {/* Logo - top */}
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-6"
            >
              <motion.div
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-11 h-11 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/20"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Wansni<span className="text-[#FF6B00]">Auto</span>
                </h1>
                <p className="text-[10px] text-white/30 tracking-[0.3em] uppercase">Premium Rideshare</p>
              </div>
            </motion.div>

            {/* Real Mercedes - full width drive */}
            <div className="relative w-full flex items-center justify-center py-2">
              <div className="relative">
                <RealMercedes isDriving={phase === 'driving'} />
              </div>
            </div>

            {/* Road */}
            <div className="w-full max-w-md px-8">
              <AnimatedRoad />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-[11px] text-white/25 mt-5 text-center tracking-[0.35em] uppercase font-light"
            >
              Travel in Style
            </motion.p>

            {/* Progress bar */}
            <div className="w-40 mt-5">
              <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[8px] text-white/20 text-center mt-1.5 tracking-wider">
                {Math.min(progress, 100)}%
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
