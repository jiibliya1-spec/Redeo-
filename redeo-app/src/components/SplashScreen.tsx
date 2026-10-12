import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';

interface SplashScreenProps {
  onComplete: () => void;
}

/* Timeline (seconds)
 *  0.00 – 0.65  car drives in from the right
 *  0.65 – 1.20  car stops, passenger walks in
 *  1.20 – 1.80  car drives away to the left
 *  1.85 – 2.15  fade out, app opens
 */
const CAR_DURATION = 1.9;
const CAR_TIMES = [0, 0.34, 0.63, 0.95, 1];

function Car() {
  return (
    <svg viewBox="0 0 200 84" width="190" height="80" aria-hidden="true">
      <defs>
        <linearGradient id="splash-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8A2B" />
          <stop offset="1" stopColor="#F05A00" />
        </linearGradient>
      </defs>
      {/* ground shadow */}
      <ellipse cx="100" cy="80" rx="86" ry="4" fill="rgba(0,0,0,0.45)" />
      {/* cabin */}
      <path d="M50 42 L70 14 Q72 11 77 11 L128 11 Q134 11 138 15 L162 42 Z" fill="url(#splash-body)" />
      {/* windows */}
      <path d="M59 40 L75 17 L103 17 L103 40 Z" fill="#1B222C" />
      <path d="M109 17 L127 17 Q130 17 132 19 L149 40 L109 40 Z" fill="#1B222C" />
      <path d="M62 38 L77 19 L84 19 L70 38 Z" fill="rgba(255,255,255,0.14)" />
      {/* body */}
      <rect x="8" y="40" width="184" height="30" rx="13" fill="url(#splash-body)" />
      <rect x="8" y="58" width="184" height="12" rx="6" fill="rgba(0,0,0,0.16)" />
      {/* door line + brand mark */}
      <path d="M106 42 L106 62" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
      <path d="M129 62 V49 H135 A4.5 4.5 0 0 1 135 58 H129 M134 58 L140 63" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* lights */}
      <rect x="9" y="48" width="9" height="6" rx="3" fill="#FFF2C4" />
      <rect x="183" y="48" width="8" height="6" rx="3" fill="#FF3B30" />
      {/* wheels */}
      {[48, 154].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="68" r="14" fill="#12151A" stroke="#2B313B" strokeWidth="2" />
          <motion.g
            style={{ originX: `${cx}px`, originY: '68px', transformBox: 'view-box' as any }}
            animate={{ rotate: -720 }}
            transition={{ duration: CAR_DURATION, ease: 'linear' }}
          >
            <circle cx={cx} cy="68" r="6" fill="#AEB6C2" />
            <path d={`M${cx - 6} 68 L${cx + 6} 68 M${cx} 62 L${cx} 74`} stroke="#4A525E" strokeWidth="2" />
          </motion.g>
        </g>
      ))}
    </svg>
  );
}

function Passenger() {
  return (
    <svg viewBox="0 0 34 64" width="30" height="56" aria-hidden="true">
      {/* bag */}
      <rect x="21" y="38" width="11" height="14" rx="3" fill="#C2410C" />
      <path d="M24 38 L24 35 L29 35 L29 38" fill="none" stroke="#9A3412" strokeWidth="1.5" />
      {/* legs */}
      <rect x="9" y="42" width="6" height="18" rx="3" fill="#2F3745" />
      <rect x="17" y="42" width="6" height="18" rx="3" fill="#2F3745" />
      {/* body */}
      <rect x="6" y="18" width="20" height="28" rx="8" fill="#ECEFF3" />
      {/* arm */}
      <rect x="21" y="22" width="5" height="18" rx="2.5" fill="#D5DAE1" />
      {/* head */}
      <circle cx="16" cy="10" r="7.5" fill="#E9B98F" />
      <path d="M8.5 9 Q9 2 16 2 Q23 2 23.5 9 Q20 6 16 6 Q12 6 8.5 9 Z" fill="#2A211C" />
    </svg>
  );
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), reduceMotion ? 500 : 1850);
    const t2 = setTimeout(() => onComplete(), reduceMotion ? 700 : 2150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete, reduceMotion]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            overflow: 'hidden',
            background:
              'radial-gradient(ellipse 80% 45% at 50% 62%, rgba(255,107,0,0.16) 0%, rgba(15,17,21,0) 70%), #0F1115',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeIn' }}
        >
          {/* Brand */}
          <motion.div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(24% + env(safe-area-inset-top, 0px) / 2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo className="w-16 h-16" />
            <div
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(24px, 6.5vw, 34px)',
                letterSpacing: '-0.01em',
                color: '#fff',
                lineHeight: 1,
              }}
            >
              Re<span style={{ color: '#FF6B00' }}>deo</span>
            </div>
          </motion.div>

          {!reduceMotion && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 130 }}>
              {/* road */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2,
                  background:
                    'linear-gradient(to right, transparent, rgba(255,255,255,0.28) 20%, rgba(255,255,255,0.28) 80%, transparent)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  bottom: -12,
                  height: 2,
                  backgroundImage:
                    'repeating-linear-gradient(to right, rgba(255,107,0,0.5) 0 18px, transparent 18px 38px)',
                }}
              />

              {/* passenger waiting, then boarding */}
              <motion.div
                style={{ position: 'absolute', left: '50%', bottom: 26, marginLeft: -4, zIndex: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, 12], scale: [1, 1, 1, 0.65] }}
                transition={{ duration: 1.3, times: [0, 0.25, 0.62, 0.8], ease: 'easeOut' }}
              >
                <Passenger />
              </motion.div>

              {/* car: drives in, stops, then leaves */}
              <motion.div
                style={{ position: 'absolute', left: '50%', bottom: 8, marginLeft: -95, zIndex: 2 }}
                initial={{ x: '70vw' }}
                animate={{
                  x: ['70vw', '0vw', '0vw', '-85vw', '-85vw'],
                  rotate: [0, -1.8, 0, 1.6, 0],
                }}
                transition={{
                  duration: CAR_DURATION,
                  times: CAR_TIMES,
                  ease: ['easeOut', 'linear', 'easeIn', 'linear'],
                }}
              >
                {/* headlight glow */}
                <motion.div
                  style={{
                    position: 'absolute',
                    left: -64,
                    top: 40,
                    width: 80,
                    height: 26,
                    background: 'radial-gradient(ellipse at right, rgba(255,242,196,0.38), transparent 70%)',
                    filter: 'blur(3px)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 1] }}
                  transition={{ duration: 0.4 }}
                />
                {/* speed streaks behind the car */}
                <motion.div
                  style={{
                    position: 'absolute',
                    left: 170,
                    top: 46,
                    width: 70,
                    height: 14,
                    background:
                      'repeating-linear-gradient(to bottom, rgba(255,107,0,0.55) 0 2px, transparent 2px 6px)',
                    maskImage: 'linear-gradient(to right, #000, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, #000, transparent)',
                  }}
                  animate={{ opacity: [0.9, 0, 0, 0.9, 0.9] }}
                  transition={{ duration: CAR_DURATION, times: CAR_TIMES }}
                />
                <Car />
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
