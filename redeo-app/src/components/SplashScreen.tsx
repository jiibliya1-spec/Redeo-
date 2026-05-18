import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ─── Mercedes-Benz Star Logo ─── */
function MercedesStar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Outer circle */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Three-pointed star */}
      <path
        d="M50 8 L50 50 M50 50 L14 78 M50 50 L86 78"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner circle accent */}
      <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/* ─── Mercedes-Benz S-Class Style Car ─── */
function MercedesCar({ isDriving = true }: { isDriving?: boolean }) {
  return (
    <motion.div
      initial={{ x: '50vw', opacity: 0 }}
      animate={{ x: '-120vw', opacity: [0, 1, 1, 1, 0] }}
      transition={{
        x: { duration: 4.5, ease: 'linear' },
        opacity: { duration: 4.5, times: [0, 0.08, 0.85, 0.95, 1] },
      }}
      className="relative"
    >
      <motion.div
        animate={isDriving ? { y: [-1.5, 1, -1.5] } : {}}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* ─── Mercedes Body (S-Class Silhouette) ─── */}
        <div className="relative w-80 h-28">

          {/* Cabin / Greenhouse - sleek S-class curve */}
          <div className="absolute top-0 left-14 right-16 h-14">
            {/* Roof line - elegant coupe-like slope */}
            <div className="absolute top-1 left-0 right-2 h-3 bg-gradient-to-r from-[#2A2A2A] via-[#3D3D3D] to-[#2A2A2A] rounded-t-[50px]" />
            {/* Windshield - swept back */}
            <div className="absolute top-3 right-0 w-24 h-11 bg-gradient-to-br from-sky-200/60 to-sky-400/30 rounded-tr-[40px] rounded-tl-sm border border-white/10" />
            {/* Side window - long executive style */}
            <div className="absolute top-3 left-4 w-24 h-11 bg-gradient-to-b from-sky-200/40 to-sky-400/20 rounded-t-lg border-l border-t border-white/10" />
            {/* B-pillar */}
            <div className="absolute top-3 left-[52%] w-2 h-11 bg-[#1A1A1A]/80" />
            {/* Rear window */}
            <div className="absolute top-3 left-0 w-7 h-11 bg-gradient-to-bl from-sky-200/40 to-sky-400/20 rounded-tl-[25px] border border-white/10" />
            {/* Chrome window trim */}
            <div className="absolute top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          {/* ─── Main Body ─── */}
          <div className="absolute bottom-2 left-0 right-0 h-16 bg-gradient-to-b from-[#1C1C1E] via-[#1A1A1C] to-[#141415] rounded-[32px] border border-[#333]/50 shadow-2xl">
            {/* Hood shine */}
            <div className="absolute top-1 left-20 right-24 h-4 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent rounded-full" />
            {/* Belt line chrome accent */}
            <div className="absolute top-5 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* ─── Mercedes Grille & Front ─── */}
            <div className="absolute top-2 -right-1 w-10 h-12">
              {/* Diamond grille pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#2A2A2A] to-[#1A1A1A] rounded-r-xl border-l border-[#444]/50 overflow-hidden">
                {/* Diamond pattern lines */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-1 left-1 w-3 h-3 border border-[#555] rotate-45" />
                  <div className="absolute top-1 left-5 w-3 h-3 border border-[#555] rotate-45" />
                  <div className="absolute top-4 left-3 w-3 h-3 border border-[#555] rotate-45" />
                  <div className="absolute top-4 left-7 w-3 h-3 border border-[#555] rotate-45" />
                  <div className="absolute top-7 left-1 w-3 h-3 border border-[#555] rotate-45" />
                  <div className="absolute top-7 left-5 w-3 h-3 border border-[#555] rotate-45" />
                </div>
              </div>
              {/* Mercedes Star on grille */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80">
                <MercedesStar size={20} />
              </div>
            </div>

            {/* ─── LED Headlights (modern Mercedes style) ─── */}
            <div className="absolute top-4 -right-1 w-7 h-8">
              {/* Daytime running light - LED strip */}
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-0 right-0 w-6 h-1.5 bg-gradient-to-r from-blue-300 to-white rounded-full shadow-[0_0_12px_rgba(150,200,255,0.6)]"
              />
              {/* Main headlight */}
              <div className="absolute top-2 right-0 w-5 h-5 bg-gradient-to-br from-blue-200/80 via-blue-300/50 to-transparent rounded-full border border-blue-400/30 shadow-[0_0_15px_rgba(100,150,255,0.4)]" />
              {/* LED beam */}
              <motion.div
                animate={{ opacity: [0.1, 0.35, 0.1], scaleX: [1, 1.4, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute top-3 -right-16 w-16 h-4 bg-gradient-to-r from-blue-300/20 to-transparent rounded-r-full"
              />
            </div>

            {/* ─── Taillights ─── */}
            <div className="absolute top-4 -left-1 w-6 h-7">
              <motion.div
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-0 left-0 w-5 h-1.5 bg-gradient-to-l from-red-400 to-red-600 rounded-full shadow-[0_0_8px_rgba(255,50,50,0.4)]"
              />
              <div className="absolute top-2 left-0 w-4 h-4 bg-gradient-to-bl from-red-500/70 to-red-700/40 rounded-full" />
            </div>

            {/* Door lines */}
            <div className="absolute top-2 left-[35%] w-px h-10 bg-white/5" />
            <div className="absolute top-2 left-[68%] w-px h-10 bg-white/5" />

            {/* Chrome door handles */}
            <div className="absolute top-6 left-[38%] w-5 h-1 bg-gradient-to-r from-gray-500/60 via-white/40 to-gray-500/60 rounded-full" />
            <div className="absolute top-6 left-[72%] w-5 h-1 bg-gradient-to-r from-gray-500/60 via-white/40 to-gray-500/60 rounded-full" />

            {/* Side mirror */}
            <div className="absolute -top-0 left-[75%] w-5 h-4 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] rounded-lg border border-[#444]/40 shadow-md" />
          </div>

          {/* Front bumper */}
          <div className="absolute -bottom-0 -right-1 w-12 h-6 bg-gradient-to-br from-[#1C1C1E] to-[#0F0F10] rounded-br-2xl" />
          {/* Rear bumper */}
          <div className="absolute -bottom-0 -left-1 w-12 h-6 bg-gradient-to-bl from-[#1C1C1E] to-[#0F0F10] rounded-bl-2xl" />

          {/* Exhaust - dual (AMG style) */}
          <div className="absolute -left-2 bottom-2 w-5 h-3 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full border border-gray-500" />
        </div>

        {/* ─── Wheels (Mercedes AMG multi-spoke style) ─── */}
        <div className="flex justify-between w-56 mx-auto -mt-3 relative z-10 px-5">
          {/* Front wheel */}
          <motion.div
            animate={isDriving ? { rotate: -360 } : {}}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-full border-[3px] border-gray-600 flex items-center justify-center shadow-xl shadow-black/40"
          >
            {/* Rim - AMG multi-spoke */}
            <div className="relative w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border border-gray-600 flex items-center justify-center">
              {/* Spokes */}
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-0.5 h-4 bg-gradient-to-b from-gray-500 to-gray-700"
                  style={{ transform: `rotate(${deg}deg)` }}
                />
              ))}
              {/* Center cap with Mercedes star */}
              <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center border border-gray-400">
                <div className="text-[6px] text-gray-300">
                  <MercedesStar size={10} />
                </div>
              </div>
            </div>
          </motion.div>
          {/* Rear wheel */}
          <motion.div
            animate={isDriving ? { rotate: -360 } : {}}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] rounded-full border-[3px] border-gray-600 flex items-center justify-center shadow-xl shadow-black/40"
          >
            <div className="relative w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border border-gray-600 flex items-center justify-center">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-0.5 h-4 bg-gradient-to-b from-gray-500 to-gray-700"
                  style={{ transform: `rotate(${deg}deg)` }}
                />
              ))}
              <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center border border-gray-400">
                <div className="text-[6px] text-gray-300">
                  <MercedesStar size={10} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Exhaust smoke particles ─── */
function ExhaustSmoke() {
  return (
    <div className="absolute -left-3 bottom-6">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0.4, scale: 0.3 }}
          animate={{
            x: -35 - i * 18,
            y: -12 - i * 6,
            opacity: 0,
            scale: 1.8 + i * 0.4,
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.28,
            ease: 'easeOut',
          }}
          className="absolute w-4 h-4 bg-gray-600/25 rounded-full blur-sm"
        />
      ))}
    </div>
  );
}

/* ─── Animated road ─── */
function AnimatedRoad() {
  return (
    <div className="relative w-full h-20 mt-2 overflow-hidden">
      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-[#161A20] to-[#0C0E12] border-t border-white/5">
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex gap-5">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 800 + i * 60 }}
              animate={{ x: -300 }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'linear',
              }}
              className="w-8 h-0.5 bg-white/[0.08] rounded-full shrink-0"
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-12 w-full h-px bg-[#FF6B00]/[0.06]" />
    </div>
  );
}

/* ─── Speed lines ─── */
function SpeedLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: -300, opacity: [0, 0.2, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.25 + 0.2,
            ease: 'linear',
          }}
          className="absolute h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          style={{
            top: `${25 + (i % 6) * 10}%`,
            width: `${30 + i * 12}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Splash Screen ─── */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'driving' | 'exit'>('intro');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('driving'), 100);
    // Start exit fade just before car finishes
    const t2 = setTimeout(() => setPhase('exit'), 4200);
    // Complete after car has fully exited
    const t3 = setTimeout(() => onComplete(), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 2));
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'exit' || progress < 100 ? (
        <motion.div
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-[#0F1115] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115] via-[#0F1115] to-[#13161C]" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
          <SpeedLines />

          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
            {/* Logo + Mercedes star */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-10"
            >
              <motion.div
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/15"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Wansni<span className="text-[#FF6B00]">Auto</span>
                </h1>
                <p className="text-[10px] text-[#A0A0A0]/60 tracking-[0.3em] uppercase">Premium Rideshare</p>
              </div>
            </motion.div>

            {/* Mercedes Car */}
            <div className="relative w-full flex justify-center">
              <div className="relative">
                <MercedesCar isDriving={phase === 'driving'} />
                <ExhaustSmoke />
              </div>
            </div>

            {/* Road */}
            <div className="w-80">
              <AnimatedRoad />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-xs text-[#A0A0A0]/50 mt-8 text-center font-light tracking-widest uppercase"
            >
              Travel in Style
            </motion.p>

            {/* Progress */}
            <div className="w-44 mt-6">
              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[9px] text-[#A0A0A0]/30 text-center mt-2 tracking-wider">
                {Math.min(progress, 100)}%
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0F1115] to-transparent" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
