import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ─── Sleek Modern Car (CSS Art) ─── */
function SleekCar({ isDriving = true }: { isDriving?: boolean }) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 50, damping: 15, duration: 1.5 }}
      className="relative"
    >
      <motion.div
        animate={isDriving ? { y: [-2, 1, -2] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* Car Silhouette - sleek sedan style */}
        <div className="relative w-72 h-24">
          {/* Roof / cabin */}
          <div className="absolute top-0 left-16 right-20 h-12">
            {/* Windshield */}
            <div className="absolute top-2 right-0 w-20 h-10 bg-gradient-to-br from-sky-300/70 to-sky-500/40 rounded-tr-[30px] rounded-tl-md border border-white/20" />
            {/* Side windows */}
            <div className="absolute top-2 left-6 w-16 h-10 bg-gradient-to-b from-sky-300/50 to-sky-500/30 rounded-t-lg border border-white/10" />
            {/* Rear window */}
            <div className="absolute top-2 left-0 w-8 h-10 bg-gradient-to-bl from-sky-300/50 to-sky-500/30 rounded-tl-[20px] border border-white/10" />
            {/* Roof line */}
            <div className="absolute top-0 left-2 right-4 h-3 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00] rounded-t-[40px]" />
          </div>

          {/* Main body */}
          <div className="absolute bottom-2 left-0 right-0 h-14 bg-gradient-to-b from-[#FF6B00] via-[#FF6B00] to-[#E56000] rounded-3xl border border-[#CC5500]/50 shadow-2xl shadow-[#FF6B00]/20">
            {/* Shine reflection */}
            <div className="absolute top-1 left-8 right-16 h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />

            {/* Door line */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-px h-8 bg-[#CC5500]/40" />
            <div className="absolute top-2 left-[40%] w-px h-8 bg-[#CC5500]/30" />

            {/* Door handles */}
            <div className="absolute top-4 left-[45%] w-4 h-1 bg-[#CC5500]/60 rounded-full" />
            <div className="absolute top-4 right-16 w-4 h-1 bg-[#CC5500]/60 rounded-full" />

            {/* Side mirror */}
            <div className="absolute -top-1 right-16 w-4 h-3 bg-[#CC5500] rounded-md" />

            {/* Headlight - front */}
            <div className="absolute top-3 -right-1 w-6 h-7 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 rounded-r-full border border-amber-500/50 shadow-[0_0_20px_rgba(255,200,0,0.5)]" />
            {/* Headlight beam */}
            <motion.div
              animate={{ opacity: [0.2, 0.6, 0.2], scaleX: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-4 -right-20 w-20 h-5 bg-gradient-to-r from-amber-300/30 to-transparent rounded-r-full"
            />

            {/* Taillight - rear */}
            <div className="absolute top-3 -left-1 w-4 h-7 bg-gradient-to-l from-red-500 to-red-700 rounded-l-full border border-red-600/50 shadow-[0_0_10px_rgba(255,0,0,0.3)]" />

            {/* WansniAuto branding */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/40 tracking-[0.2em] uppercase">
              WansniAuto
            </div>
          </div>

          {/* Bumper front */}
          <div className="absolute -bottom-0 -right-1 w-10 h-6 bg-gradient-to-br from-[#E56000] to-[#CC5500] rounded-br-2xl rounded-tr-lg" />
          {/* Bumper rear */}
          <div className="absolute -bottom-0 -left-1 w-10 h-6 bg-gradient-to-bl from-[#E56000] to-[#CC5500] rounded-bl-2xl rounded-tl-lg" />
        </div>

        {/* Wheels */}
        <div className="flex justify-between w-48 mx-auto -mt-3 relative z-10 px-4">
          {/* Front wheel */}
          <motion.div
            animate={isDriving ? { rotate: -360 } : {}}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 bg-gradient-to-br from-[#1B1F27] to-[#2C3E50] rounded-full border-[3px] border-gray-500 flex items-center justify-center shadow-xl"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full border border-gray-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            </div>
            {/* Spokes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-10 bg-gray-500/50 rounded-full" />
              <div className="absolute w-10 h-1 bg-gray-500/50 rounded-full" />
            </div>
          </motion.div>
          {/* Rear wheel */}
          <motion.div
            animate={isDriving ? { rotate: -360 } : {}}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 bg-gradient-to-br from-[#1B1F27] to-[#2C3E50] rounded-full border-[3px] border-gray-500 flex items-center justify-center shadow-xl"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full border border-gray-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            </div>
            {/* Spokes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-10 bg-gray-500/50 rounded-full" />
              <div className="absolute w-10 h-1 bg-gray-500/50 rounded-full" />
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
    <div className="absolute -left-4 bottom-6">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0.5, scale: 0.3 }}
          animate={{
            x: -40 - i * 20,
            y: -15 - i * 8,
            opacity: 0,
            scale: 2 + i * 0.5,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.25,
            ease: 'easeOut',
          }}
          className="absolute w-5 h-5 bg-gray-500/30 rounded-full blur-sm"
        />
      ))}
    </div>
  );
}

/* ─── Animated road with moving lines ─── */
function AnimatedRoad() {
  return (
    <div className="relative w-full h-20 mt-2 overflow-hidden">
      {/* Road surface */}
      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-[#1B2631] to-[#0F1115] border-t border-[#2C3E50]/50">
        {/* Moving road lines */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex gap-6">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 500 + i * 80 }}
              animate={{ x: -150 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.22,
                ease: 'linear',
              }}
              className="w-10 h-1 bg-yellow-500/40 rounded-full shrink-0"
            />
          ))}
        </div>
      </div>
      {/* Road edge glow */}
      <div className="absolute bottom-12 w-full h-px bg-[#FF6B00]/10" />
    </div>
  );
}

/* ─── Speed lines for motion effect ─── */
function SpeedLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: -200, opacity: [0, 0.3, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.4 + 0.5,
            ease: 'linear',
          }}
          className="absolute h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{
            top: `${30 + i * 8}%`,
            width: `${40 + i * 15}px`,
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
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    const t3 = setTimeout(() => onComplete(), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 2.5));
    }, 80);
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
          {/* Background subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115] via-[#0F1115] to-[#161A22]" />

          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />

          {/* Speed lines */}
          <SpeedLines />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
            {/* Logo */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-10"
            >
              <motion.div
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-11 h-11 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/15"
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
                <p className="text-[10px] text-[#A0A0A0] tracking-[0.25em] uppercase">Morocco Rideshare</p>
              </div>
            </motion.div>

            {/* Car Animation */}
            <div className="relative w-full flex justify-center">
              <div className="relative">
                <SleekCar isDriving={phase === 'driving'} />
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
              className="text-sm text-[#A0A0A0]/70 mt-8 text-center font-light tracking-wide"
            >
              Your journey starts here
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
              <p className="text-[9px] text-[#A0A0A0]/40 text-center mt-2 tracking-wider">
                {Math.min(progress, 100)}%
              </p>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0F1115] to-transparent" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
