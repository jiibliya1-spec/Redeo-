import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ─── Cartoon Character (CSS Art) ─── */
function CartoonCharacter({ isDriver = false, delay = 0 }: { isDriver?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-2, 2, -2] }}
      transition={{ duration: 0.6, repeat: Infinity, delay, ease: 'easeInOut' }}
      className="flex flex-col items-center"
    >
      {/* Head */}
      <div className={`relative rounded-full ${isDriver ? 'w-10 h-10' : 'w-9 h-9'} bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-400`}>
        {/* Hair */}
        <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 ${isDriver ? 'w-9 h-4' : 'w-8 h-4'} bg-[#3D2314] rounded-t-full`} />
        {/* Eyes */}
        <div className="absolute top-3 left-1.5 w-2 h-2 bg-[#1B1F27] rounded-full">
          <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 bg-white rounded-full" />
        </div>
        <div className="absolute top-3 right-1.5 w-2 h-2 bg-[#1B1F27] rounded-full">
          <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 bg-white rounded-full" />
        </div>
        {/* Smile */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1.5 border-b-2 border-[#C0392B] rounded-full" />
      </div>
      {/* Body */}
      <div className={`mt-0.5 ${isDriver ? 'w-8 h-7' : 'w-7 h-6'} rounded-t-xl ${isDriver ? 'bg-[#FF6B00]' : 'bg-blue-500'} border-2 border-white/20`}>
        {/* Seatbelt */}
        <div className="absolute top-0 right-2 w-0.5 h-full bg-gray-700" />
      </div>
    </motion.div>
  );
}

/* ─── Cartoon Car (CSS Art) ─── */
function CartoonCar({ isDriving = true }: { isDriving?: boolean }) {
  return (
    <motion.div
      initial={{ x: -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 60, damping: 12, duration: 1.2 }}
      className="relative"
    >
      {/* Car Body Container */}
      <motion.div
        animate={isDriving ? { y: [-1, 1, -1] } : {}}
        transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* Car Top (Roof + Windows) */}
        <div className="relative mx-auto w-44 h-16">
          {/* Roof */}
          <div className="absolute bottom-0 left-3 right-3 h-14 bg-gradient-to-b from-[#FF8533] to-[#FF6B00] rounded-t-[40px] border-2 border-[#E56000]" />
          {/* Windshield (front) */}
          <div className="absolute bottom-1 right-4 w-14 h-11 bg-gradient-to-br from-sky-200/80 to-sky-400/60 rounded-tr-[30px] rounded-tl-lg border border-white/30" />
          {/* Rear window */}
          <div className="absolute bottom-1 left-4 w-12 h-11 bg-gradient-to-bl from-sky-200/80 to-sky-400/60 rounded-tl-[30px] rounded-tr-lg border border-white/30" />
        </div>

        {/* Car Bottom Body */}
        <div className="relative mx-auto w-56 h-16 bg-gradient-to-b from-[#FF6B00] to-[#E56000] rounded-3xl border-2 border-[#CC5500] shadow-xl">
          {/* Characters inside the car */}
          <div className="absolute -top-10 left-8 flex gap-6">
            <CartoonCharacter isDriver={true} delay={0} />
            <CartoonCharacter isDriver={false} delay={0.3} />
          </div>

          {/* Steering wheel */}
          <div className="absolute top-1 right-10 w-5 h-5 border-2 border-gray-600 rounded-full" />

          {/* Door line */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-[#CC5500]/50" />

          {/* Front headlight */}
          <div className="absolute top-4 -right-1 w-5 h-7 bg-gradient-to-r from-yellow-200 to-yellow-400 rounded-r-full border border-yellow-500 shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
          {/* Headlight beam */}
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute top-5 -right-16 w-14 h-6 bg-gradient-to-r from-yellow-300/40 to-transparent rounded-r-full"
          />

          {/* Rear taillight */}
          <div className="absolute top-4 -left-1 w-4 h-7 bg-gradient-to-l from-red-500 to-red-700 rounded-l-full border border-red-600" />

          {/* Door handle */}
          <div className="absolute top-5 left-24 w-5 h-1.5 bg-[#CC5500] rounded-full" />
          <div className="absolute top-5 right-14 w-5 h-1.5 bg-[#CC5500] rounded-full" />

          {/* WansniAuto text on car */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/80 tracking-wider">
            WANSNIAUTO
          </div>
        </div>

        {/* Bumper front */}
        <div className="absolute -bottom-1 -right-1 w-8 h-5 bg-[#CC5500] rounded-br-2xl rounded-tr-lg" />
        {/* Bumper rear */}
        <div className="absolute -bottom-1 -left-1 w-8 h-5 bg-[#CC5500] rounded-bl-2xl rounded-tl-lg" />
      </motion.div>

      {/* Wheels */}
      <div className="flex justify-between w-44 mx-auto -mt-3 relative z-10">
        {/* Front wheel */}
        <motion.div
          animate={isDriving ? { rotate: 360 } : {}}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 bg-[#1B1F27] rounded-full border-4 border-gray-600 flex items-center justify-center shadow-lg"
        >
          <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400">
            <div className="w-full h-0.5 bg-gray-400 absolute top-1/2 -translate-y-1/2" />
            <div className="w-0.5 h-full bg-gray-400 absolute left-1/2 -translate-x-1/2" />
          </div>
        </motion.div>
        {/* Rear wheel */}
        <motion.div
          animate={isDriving ? { rotate: 360 } : {}}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 bg-[#1B1F27] rounded-full border-4 border-gray-600 flex items-center justify-center shadow-lg"
        >
          <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400 relative">
            <div className="w-full h-0.5 bg-gray-400 absolute top-1/2 -translate-y-1/2" />
            <div className="w-0.5 h-full bg-gray-400 absolute left-1/2 -translate-x-1/2" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Road with moving lines ─── */
function AnimatedRoad() {
  return (
    <div className="relative w-full h-20 mt-4 overflow-hidden">
      {/* Road surface */}
      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-b from-[#2C3E50] to-[#1B2631] border-t-2 border-[#34495E]">
        {/* Road lines */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex gap-8">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 400 + i * 100 }}
              animate={{ x: -200 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'linear',
              }}
              className="w-12 h-1.5 bg-yellow-400/60 rounded-full shrink-0"
            />
          ))}
        </div>
      </div>
      {/* Road edge */}
      <div className="absolute bottom-12 w-full h-1 bg-[#27AE60]" />
      {/* Grass */}
      <div className="absolute bottom-13 w-full h-6 bg-gradient-to-t from-[#27AE60]/20 to-transparent" />
    </div>
  );
}

/* ─── Smoke particles from exhaust ─── */
function ExhaustSmoke() {
  return (
    <div className="absolute -left-6 bottom-8">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0.6, scale: 0.5 }}
          animate={{
            x: -30 - i * 15,
            y: -10 - i * 5,
            opacity: 0,
            scale: 1.5 + i * 0.3,
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeOut',
          }}
          className="absolute w-4 h-4 bg-gray-400/40 rounded-full"
        />
      ))}
    </div>
  );
}

/* ─── Star decorations ─── */
function SparkleStars() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.7,
          }}
          className="absolute text-yellow-400"
          style={{
            top: `${15 + i * 12}%`,
            left: `${10 + i * 15}%`,
            fontSize: `${8 + i * 3}px`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

/* ─── Main Splash Screen ─── */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'driving' | 'exit'>('intro');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 1: Car drives in (0-1.5s)
    const t1 = setTimeout(() => setPhase('driving'), 100);
    // Phase 2: Show for a while then exit (3.5s)
    const t2 = setTimeout(() => setPhase('exit'), 3500);
    // Phase 3: Complete
    const t3 = setTimeout(() => onComplete(), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  // Progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {phase !== 'exit' || progress < 100 ? (
        <motion.div
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-[#0F1115] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115] via-[#0F1115] to-[#1B1F27]" />

          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }} />

          {/* Sparkle stars */}
          <SparkleStars />

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-8"
            >
              {/* Car icon */}
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/20"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Wansni<span className="text-[#FF6B00]">Auto</span>
                </h1>
                <p className="text-xs text-[#A0A0A0] tracking-widest uppercase">Morocco Rideshare</p>
              </div>
            </motion.div>

            {/* Car Animation */}
            <div className="relative">
              <CartoonCar isDriving={phase === 'driving'} />
              <ExhaustSmoke />
            </div>

            {/* Road */}
            <div className="w-72">
              <AnimatedRoad />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-sm text-[#A0A0A0] mt-6 text-center"
            >
              Your journey starts here
            </motion.p>

            {/* Progress bar */}
            <div className="w-48 mt-6">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[10px] text-[#A0A0A0] text-center mt-2">{Math.min(progress, 100)}%</p>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F1115] to-transparent" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
