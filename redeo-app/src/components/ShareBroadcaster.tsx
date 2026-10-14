import { useEffect, useRef } from 'react';
import { Radio, Square } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PUSH_EVERY_MS, pushPosition, stopShare, useShare } from '@/lib/tripShare';

/** Mounted once in the app: keeps sending the GPS position while a live share is active, wherever the user navigates. */
export function ShareBroadcaster() {
  const { t } = useI18n();
  const session = useShare((s) => s.session);
  const error = useShare((s) => s.error);
  const lastPush = useRef(0);
  const latest = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!session) return;
    let watchId: number | null = null;
    let wake: any = null;
    let timer: number | undefined;
    const send = () => {
      const p = latest.current;
      if (!p) return;
      lastPush.current = Date.now();
      pushPosition(p);
    };
    const requestWake = async () => {
      try { wake = await (navigator as any).wakeLock?.request('screen'); } catch { wake = null; }
    };
    if (!('geolocation' in navigator)) { useShare.getState().set({ error: 'unavailable' }); return; }
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        latest.current = p;
        if (Date.now() - lastPush.current >= PUSH_EVERY_MS) send();
      },
      (e) => useShare.getState().set({ error: e.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    // keep sending even when the GPS only reports on movement
    timer = window.setInterval(() => { if (Date.now() - lastPush.current >= PUSH_EVERY_MS) send(); }, PUSH_EVERY_MS);
    requestWake();
    const onVis = () => { if (document.visibilityState === 'visible') { requestWake(); send(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      try { wake?.release?.(); } catch { /* ignore */ }
      latest.current = null; lastPush.current = 0;
    };
  }, [session?.token]);

  if (!session) return null;
  return (
    <div className="fixed left-3 right-3 bottom-[88px] md:bottom-4 z-40 max-w-md mx-auto">
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg border ${error ? 'bg-red-500/15 border-red-500/30' : 'bg-[#1B1F27] border-[#FF6B00]/30'}`}>
        <span className="relative flex w-9 h-9 items-center justify-center rounded-full bg-[#FF6B00]/15 shrink-0">
          {!error && <span className="absolute inset-0 rounded-full bg-[#FF6B00]/30 animate-ping" />}
          <Radio className="relative w-4 h-4 text-[#FF6B00]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{t('share.banner')}</p>
          <p className="text-xs text-[#A0A0A0] truncate">
            {error === 'denied' ? t('share.err_denied') : error === 'unavailable' ? t('share.err_unavailable') : `${session.from} → ${session.to}`}
          </p>
        </div>
        <button onClick={() => stopShare()} className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg px-3 py-2 shrink-0">
          <Square className="w-3 h-3 fill-current" />{t('share.stop')}
        </button>
      </div>
    </div>
  );
}
