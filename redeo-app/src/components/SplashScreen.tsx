import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ORANGE = '#FF6B00';
const ORANGE_DIM = 'rgba(255,107,0,0.15)';
const ORANGE_MID = 'rgba(255,107,0,0.5)';

interface SplashScreenProps {
  onComplete: () => void;
}

function Particle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${ORANGE} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{
        opacity: [0, 0.8, 0.5, 0],
        scale: [0, 1, 0.7, 0],
        y: [-10, -50, -90],
      }}
      transition={{
        delay,
        duration: 2.5,
        ease: 'easeOut',
        repeat: Infinity,
        repeatDelay: Math.random() * 1.5 + 0.5,
      }}
    />
  );
}

function RoadTrail({ xPos, angle, delay }: { xPos: string; angle: string; delay: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        bottom: 0,
        left: xPos,
        width: 2,
        height: '50%',
        background: `linear-gradient(to top, transparent, ${ORANGE_MID}, ${ORANGE}, ${ORANGE_MID}, transparent)`,
        transformOrigin: 'bottom center',
        filter: `blur(0.5px) drop-shadow(0 0 4px ${ORANGE})`,
        transform: `rotate(${angle})`,
        pointerEvents: 'none',
      }}
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{
        scaleY: [0, 1, 1, 0],
        opacity: [0, 1, 0.6, 0],
        y: [0, -20, -50],
      }}
      transition={{
        delay,
        duration: 1.1,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 0.35,
      }}
    />
  );
}

const BRAND_LETTERS = 'WANSNIAUTO'.split('');

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'black' | 'glow' | 'road' | 'logo' | 'name' | 'exit'>('black');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('glow'),  220),
      setTimeout(() => setPhase('road'),  900),
      setTimeout(() => setPhase('logo'),  1600),
      setTimeout(() => setPhase('name'),  2500),
      setTimeout(() => setPhase('exit'),  3800),
      setTimeout(() => onComplete(),       4500),
    ];
    const pTimers = [
      setTimeout(() => setProgress(15),  220),
      setTimeout(() => setProgress(40),  900),
      setTimeout(() => setProgress(65),  1600),
      setTimeout(() => setProgress(85),  2500),
      setTimeout(() => setProgress(100), 3800),
    ];
    return () => { [...timers, ...pTimers].forEach(clearTimeout); };
  }, [onComplete]);

  const particles = Array.from({ length: 14 }, (_, i) => ({
    x: (i * 7.3 + 5) % 95,
    y: (i * 13.7 + 10) % 75,
    delay: (i * 0.18) % 2 + 0.4,
    size: (i % 3) + 2,
  }));

  const showRoad  = phase === 'road' || phase === 'logo' || phase === 'name' || phase === 'exit';
  const showLogo  = phase === 'logo' || phase === 'name' || phase === 'exit';
  const showName  = phase === 'name' || phase === 'exit';
  const isExiting = phase === 'exit';

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        zIndex: 9999,
      }}
      animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
      transition={isExiting ? { duration: 0.7, delay: 0.4, ease: 'easeIn' } : {}}
    >
      {/* ── Cinematic camera zoom ── */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{ scale: [1.06, 1] }}
        transition={{ duration: 4.2, ease: 'easeOut' }}
      >
        {/* Ambient orange glow */}
        <AnimatePresence>
          {phase !== 'black' && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse 80% 55% at 50% 100%, rgba(255,107,0,0.09) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            />
          )}
        </AnimatePresence>

        {/* Top-right corner glow */}
        <AnimatePresence>
          {phase !== 'black' && (
            <motion.div
              style={{
                position: 'absolute',
                top: 0, right: 0,
                width: '40%', height: '35%',
                background: 'radial-gradient(ellipse at top right, rgba(255,107,0,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            />
          )}
        </AnimatePresence>

        {/* Particles */}
        {showRoad && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {particles.map((p, i) => <Particle key={i} {...p} />)}
          </div>
        )}

        {/* ── Road scene ── */}
        <AnimatePresence>
          {showRoad && (
            <motion.div
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Road surface */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: 0, left: '18%', right: '18%',
                  height: '52%',
                  background: 'linear-gradient(to bottom, transparent, #1a1a1a 55%, #222 100%)',
                  clipPath: 'polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)',
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />

              {/* Road center dashes */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    bottom: `${i * 11 + 3}%`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${3 - i * 0.5}px`,
                    height: `${18 - i * 3}px`,
                    background: 'rgba(255,255,255,0.55)',
                    borderRadius: 2,
                  }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.75, repeat: Infinity, repeatDelay: 0.4 }}
                />
              ))}

              {/* Orange road trails */}
              <RoadTrail xPos="34%" angle="-8deg" delay={0.5} />
              <RoadTrail xPos="34%" angle="-8deg" delay={0.8} />
              <RoadTrail xPos="63%" angle="8deg"  delay={0.65} />
              <RoadTrail xPos="63%" angle="8deg"  delay={0.95} />

              {/* ── Animated car ── */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: '7%',
                  left: '50%',
                  x: '-50%',
                  transformOrigin: 'center bottom',
                }}
                initial={{ scale: 0.08, y: 70, opacity: 0 }}
                animate={{ scale: 0.44, y: 0, opacity: 1 }}
                transition={{ delay: 0.65, duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={{ position: 'relative' }}>
                  {/* Car underlight glow */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse, ${ORANGE_DIM} 0%, transparent 70%)`,
                    filter: 'blur(18px)',
                    transform: 'scaleX(2) scaleY(0.35) translateY(65%)',
                  }} />
                  <svg width="320" height="155" viewBox="0 0 320 155" fill="none">
                    {/* Shadow */}
                    <ellipse cx="160" cy="148" rx="115" ry="7" fill="rgba(0,0,0,0.55)" />
                    {/* Body */}
                    <rect x="20" y="78" width="280" height="60" rx="9" fill="#1a1a1a" />
                    {/* Roof */}
                    <path d="M78 78 L100 44 L220 44 L242 78 Z" fill="#111" />
                    {/* Windshield */}
                    <path d="M106 77 L122 47 L198 47 L214 77 Z" fill="#1a2a3a" opacity="0.85" />
                    {/* Chrome strip */}
                    <rect x="20" y="106" width="280" height="3" rx="1.5" fill={ORANGE} opacity="0.55" />
                    {/* Front headlight */}
                    <ellipse cx="31" cy="97" rx="15" ry="7.5" fill={ORANGE} opacity="0.92" />
                    <ellipse cx="31" cy="97" rx="9"  ry="4.5" fill="white"  opacity="0.8" />
                    {/* Rear taillight */}
                    <ellipse cx="289" cy="97" rx="13" ry="6.5" fill="#cc2200" opacity="0.85" />
                    {/* Wheels */}
                    <circle cx="82"  cy="135" r="17" fill="#222" />
                    <circle cx="82"  cy="135" r="9"  fill="#333" />
                    <circle cx="238" cy="135" r="17" fill="#222" />
                    <circle cx="238" cy="135" r="9"  fill="#333" />
                  </svg>
                  {/* Headlight beam */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      left: -38,
                      top: '56%',
                      width: 55,
                      height: 18,
                      background: `linear-gradient(to left, ${ORANGE}, transparent)`,
                      borderRadius: '0 10px 10px 0',
                      filter: 'blur(4px)',
                    }}
                    animate={{ opacity: [0.4, 0.85, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* Road bottom glow */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: '28%', right: '28%',
                height: '22%',
                background: `radial-gradient(ellipse at bottom, ${ORANGE_DIM}, transparent)`,
                pointerEvents: 'none',
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── TOP: Logo + tagline ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        paddingTop: '11%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}>
        {/* Tagline above logo */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              style={{
                fontSize: 10,
                letterSpacing: '0.35em',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 500,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              VOYAGEZ ENSEMBLE, ÉCONOMISEZ ENSEMBLE
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logo with neon glow */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              style={{ position: 'relative' }}
              initial={{ opacity: 0, scale: 0.65 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Glow ring */}
              <motion.div
                style={{
                  position: 'absolute',
                  inset: -18,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(255,107,0,0.22) 0%, transparent 70%)`,
                  filter: 'blur(14px)',
                }}
                animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.img
                src="/images/wansniauto-logo.png"
                alt="WansniAuto"
                style={{
                  width: 'clamp(140px, 36vw, 210px)',
                  height: 'auto',
                  position: 'relative',
                  zIndex: 1,
                  display: 'block',
                }}
                animate={{
                  filter: [
                    `drop-shadow(0 0 8px ${ORANGE}) drop-shadow(0 0 18px rgba(255,107,0,0.35))`,
                    `drop-shadow(0 0 16px ${ORANGE}) drop-shadow(0 0 36px rgba(255,107,0,0.55))`,
                    `drop-shadow(0 0 8px ${ORANGE}) drop-shadow(0 0 18px rgba(255,107,0,0.35))`,
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brand name letter by letter */}
        <AnimatePresence>
          {showName && (
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Letters */}
              <div style={{ display: 'flex', letterSpacing: '0.2em' }}>
                {BRAND_LETTERS.map((letter, i) => (
                  <motion.span
                    key={i}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 900,
                      fontSize: 'clamp(20px, 4.5vw, 34px)',
                      color: i < 6 ? '#FFFFFF' : ORANGE,
                      display: 'inline-block',
                      textShadow: i < 6
                        ? '0 0 18px rgba(255,255,255,0.25)'
                        : `0 0 18px ${ORANGE}, 0 0 36px ${ORANGE_DIM}`,
                    }}
                    initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
              {/* Orange divider */}
              <motion.div
                style={{
                  height: 1,
                  background: `linear-gradient(to right, transparent, ${ORANGE}, transparent)`,
                  boxShadow: `0 0 8px ${ORANGE}`,
                }}
                initial={{ width: 0 }}
                animate={{ width: 'clamp(110px, 38vw, 190px)' }}
                transition={{ delay: 0.8, duration: 0.55, ease: 'easeOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM: car icon + tagline + progress bar ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        paddingBottom: '11%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        width: '100%',
      }}>
        {/* Car icon circle */}
        <AnimatePresence>
          {showName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div style={{
                width: 50, height: 50,
                borderRadius: '50%',
                border: `1.5px solid ${ORANGE}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 12px rgba(255,107,0,0.28), inset 0 0 8px rgba(255,107,0,0.05)`,
                background: 'rgba(255,107,0,0.04)',
              }}>
                <svg width="24" height="16" viewBox="0 0 26 18" fill="none">
                  <path d="M5 10 L8 5 L18 5 L21 10" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" />
                  <rect x="2" y="10" width="22" height="5" rx="2" fill="none" stroke={ORANGE} strokeWidth="1.5" />
                  <circle cx="7"  cy="16" r="2" fill={ORANGE} />
                  <circle cx="19" cy="16" r="2" fill={ORANGE} />
                  <rect x="10" y="7" width="6" height="3" rx="0.5" fill="rgba(255,107,0,0.3)" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom tagline */}
        <AnimatePresence>
          {showName && (
            <motion.div
              style={{
                fontSize: 10,
                letterSpacing: '0.28em',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                fontWeight: 500,
                display: 'flex', gap: 5, alignItems: 'center',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6 }}
            >
              COVOITURAGE
              <span style={{ color: ORANGE, fontWeight: 700 }}>SÛR</span>
              , RAPIDE ET FIABLE
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <AnimatePresence>
          {phase !== 'black' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: '60%', maxWidth: 230 }}
            >
              <div style={{
                height: 2,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <motion.div
                  style={{
                    position: 'absolute',
                    left: 0, top: 0,
                    height: '100%',
                    background: `linear-gradient(to right, ${ORANGE}, #FFB347)`,
                    borderRadius: 2,
                    boxShadow: `0 0 7px ${ORANGE}`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.35 }}
                />
                {/* Shimmer */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0, width: 40, height: '100%',
                    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.55), transparent)',
                  }}
                  animate={{ x: [-40, 270] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic letterbox bars */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3.5%', background: 'rgba(0,0,0,0.65)', zIndex: 20, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '3.5%', background: 'rgba(0,0,0,0.65)', zIndex: 20, pointerEvents: 'none' }} />

      {/* Initial black fade-in */}
      <AnimatePresence>
        {phase === 'black' && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 50 }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
