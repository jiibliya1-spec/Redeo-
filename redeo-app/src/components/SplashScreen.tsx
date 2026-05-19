import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true), 1800);
    const t2 = setTimeout(() => onComplete(), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!exit && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] bg-[#0A0A0C] flex flex-col items-center justify-center"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0D0D10] to-[#0A0A0C]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex items-center gap-3 mb-6"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Wansni<span className="text-[#FF6B00]">Auto</span>
              </h1>
            </div>
          </motion.div>

          {/* Mercedes Image - centered, clean */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative z-10"
          >
            <div className="relative">
              {/* Subtle glow under car */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-6 bg-[#FF6B00]/8 rounded-full blur-xl" />
              <img
                src="/images/mercedes-splash.jpg"
                alt="Mercedes-Benz"
                className="w-[340px] sm:w-[440px] h-auto object-contain"
                style={{ filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))' }}
              />
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative z-10 text-[10px] text-white/25 mt-5 tracking-[0.3em] uppercase"
          >
            Travel in Style
          </motion.p>

          {/* Progress bar - thin and fast */}
          <div className="relative z-10 w-32 mt-4">
            <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
