import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'redeo-a2hs-dismissed';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
}

/** Bottom sheet shown to first-time visitors on mobile, with install steps for Android and iPhone. */
export function AddToHomeScreen() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'android' | 'ios'>(isIos() ? 'ios' : 'android');
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }
    if (isStandalone() || !isMobile()) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); clearTimeout(timer); };
  }, []);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    close();
  };

  const steps = tab === 'ios' ? ['a2hs.i1', 'a2hs.i2', 'a2hs.i3'] : ['a2hs.a1', 'a2hs.a2', 'a2hs.a3'];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-[60] bg-black/60" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog" aria-modal="true" aria-label={t('a2hs.title')}
            className="fixed bottom-0 inset-x-0 z-[61] bg-[#1B1F27] rounded-t-3xl border-t border-white/10 p-5 pb-8 max-w-md mx-auto"
          >
            <button onClick={close} aria-label="Close" className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-[#A0A0A0]"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center"><Smartphone className="w-5 h-5 text-[#FF6B00]" /></div>
              <div>
                <h2 className="text-base font-bold text-white">{t('a2hs.title')}</h2>
                <p className="text-xs text-[#A0A0A0]">{t('a2hs.subtitle')}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {(['android', 'ios'] as const).map((k) => (
                <button key={k} onClick={() => setTab(k)} className={`flex-1 h-9 rounded-lg text-sm font-medium ${tab === k ? 'bg-[#FF6B00] text-white' : 'bg-white/5 text-[#A0A0A0]'}`}>
                  {t(k === 'ios' ? 'a2hs.tab_ios' : 'a2hs.tab_android')}
                </button>
              ))}
            </div>

            <ol className="space-y-3 mb-5">
              {steps.map((k, i) => (
                <li key={k} className="flex gap-3 items-start">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#FF6B00] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-white/90 leading-6">{t(k)}</span>
                </li>
              ))}
            </ol>

            <div className="flex gap-2">
              {deferred && tab === 'android' && (
                <Button onClick={install} className="flex-1 h-11 rounded-xl bg-[#FF6B00] text-white hover:bg-[#E56000] font-semibold">{t('a2hs.install')}</Button>
              )}
              <Button onClick={close} variant="ghost" className="flex-1 h-11 rounded-xl text-[#A0A0A0] hover:text-white hover:bg-white/5">{t('a2hs.later')}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
