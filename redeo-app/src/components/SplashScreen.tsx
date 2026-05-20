import { useEffect, useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';

  const ORANGE = '#FF6B00';

  interface SplashScreenProps {
    onComplete: () => void;
  }

  export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
      const t1 = setTimeout(() => setExiting(true), 1300);
      const t2 = setTimeout(() => onComplete(),      1900);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [onComplete]);

    return (
      <AnimatePresence>
        {!exiting && (
          <motion.div
            key="splash"
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', overflow: 'hidden' }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeIn' }}
          >
            {/* Real splash image - cinematic Ken Burns zoom */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/images/wansniauto-logo.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                transformOrigin: '55% 62%',
                willChange: 'transform',
              }}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1.0, opacity: 1 }}
              transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />

            {/* Dark cinematic gradients */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 28%, transparent 52%, rgba(0,0,0,0.7) 100%)',
              zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.5) 100%)',
              zIndex: 1,
            }} />

            {/* Animated orange light trails */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'hidden', pointerEvents: 'none' }}>
              {([
                { side: 'left',  xPos: '36%', rot: '-14deg', delays: [0.25, 0.52, 0.8] },
                { side: 'right', xPos: '62%', rot:  '14deg', delays: [0.35, 0.63, 0.92] },
              ] as const).flatMap(({ side, xPos, rot, delays }) =>
                delays.map((d, i) => (
                  <motion.div
                    key={side + i}
                    style={{
                      position: 'absolute',
                      bottom: '18%',
                      ...(side === 'left' ? { left: xPos } : { right: xPos }),
                      width: 1.5,
                      height: '46%',
                      background: 'linear-gradient(to top, transparent 0%, #FF6B00 28%, rgba(255,107,0,0.75) 65%, transparent 100%)',
                      filter: 'blur(0.8px)',
                      transformOrigin: 'bottom center',
                      transform: 'rotate(' + rot + ')',
                      boxShadow: '0 0 7px #FF6B00, 0 0 18px rgba(255,107,0,0.35)',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0], y: [0, -25] }}
                    transition={{ delay: d, duration: 0.85, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.28 }}
                  />
                ))
              )}

              {/* Road bottom orange glow */}
              <motion.div
                style={{
                  position: 'absolute', bottom: 0, left: '18%', right: '18%', height: '32%',
                  background: 'radial-gradient(ellipse at bottom, rgba(255,107,0,0.18) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.75] }}
                transition={{ delay: 0.3, duration: 1.1 }}
              />
            </div>

            {/* Logo + brand overlay */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-start', paddingTop: '10%',
            }}>
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* W circle icon */}
                <motion.div
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: '2px solid #FF6B00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 10px #FF6B00, 0 0 26px rgba(255,107,0,0.28)',
                      '0 0 20px #FF6B00, 0 0 50px rgba(255,107,0,0.48)',
                      '0 0 10px #FF6B00, 0 0 26px rgba(255,107,0,0.28)',
                    ],
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg width="34" height="23" viewBox="0 0 38 26" fill="none">
                    <path d="M2 2 L9.5 22 L14 10 L19 22 L23 10 L28.5 22 L36 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M2 2 L9.5 22 L14 10 L19 22" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </motion.div>

                {/* Brand text */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontWeight: 900,
                    fontSize: 'clamp(22px, 5.5vw, 34px)',
                    letterSpacing: '0.2em', color: '#fff',
                    textShadow: '0 2px 18px rgba(0,0,0,0.85)', lineHeight: 1,
                  }}>
                    WANSNI<span style={{ color: '#FF6B00', textShadow: '0 0 18px #FF6B00, 0 2px 18px rgba(0,0,0,0.85)' }}>AUTO</span>
                  </div>
                  <motion.div
                    style={{
                      height: 1, marginTop: 6,
                      background: 'linear-gradient(to right, transparent, #FF6B00, transparent)',
                      boxShadow: '0 0 6px #FF6B00',
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.65, duration: 0.45 }}
                  />
                  <div style={{
                    fontFamily: 'Inter, sans-serif', fontWeight: 400,
                    fontSize: 9, letterSpacing: '0.28em',
                    color: 'rgba(255,255,255,0.5)', marginTop: 5, textTransform: 'uppercase',
                  }}>
                    VOYAGEZ ENSEMBLE
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Cinematic letterbox bars */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4.5%', background: '#000', zIndex: 10 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4.5%', background: '#000', zIndex: 10 }} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  