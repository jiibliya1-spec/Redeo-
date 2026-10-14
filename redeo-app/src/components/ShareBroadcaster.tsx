import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Radio, Square } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PUSH_EVERY_MS, pushPosition, stopShare, useShare } from '@/lib/tripShare';
import { ShareTripSheet } from '@/components/ShareTripSheet';

/** Mounted once in the app: keeps sending the GPS position while a live share is active, wherever the user navigates. */
export function ShareBroadcaster() {
  const { t, dir } = useI18n();
  const session = useShare((s) => s.session);
  const error = useShare((s) => s.error);
  const lastSentAt = useShare((s) => s.lastSentAt);
  const lastPush = useRef(0);
  const latest = useRef<GeolocationPosition | null>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!session) return;
    let watchId: number | null = null;
    let wake: any = null;
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
    const timer = window.setInterval(() => { if (Date.now() - lastPush.current >= PUSH_EVERY_MS) send(); }, PUSH_EVERY_MS);
    requestWake();
    const onVis = () => { if (document.visibilityState === 'visible') { requestWake(); send(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      try { wake?.release?.(); } catch { /* ignore */ }
      latest.current = null; lastPush.current = 0;
    };
  }, [session?.token]);

  // refresh the "x s ago" label
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [session?.token]);

  // the stop button asks for a second tap
  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  if (!session) return null;

  const status = error === 'denied' ? t('share.err_denied')
    : error === 'unavailable' ? t('share.err_unavailable')
    : lastSentAt ? t('share.last_sent', { s: Math.max(0, Math.round((Date.now() - lastSentAt) / 1000)) })
    : t('share.gps_wait');

  return (
    <>
      <div className="fixed inset-x-3 bottom-[84px] md:bottom-4 z-40 mx-auto max-w-md" dir={dir}>
        <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-[#14171D]/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
          <div className={`w-1 shrink-0 ${error ? 'bg-red-500' : 'bg-gradient-to-b from-[#FF8A3D] to-[#FF6B00]'}`} />
          <button onClick={() => setOpen(true)} className="flex flex-1 min-w-0 items-center gap-3 px-3.5 py-3 text-start">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/12">
              <Radio className="relative h-[18px] w-[18px] text-[#FF6B00]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{session.from} → {session.to}</span>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${error ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
                  {t('track.live')}
                </span>
              </span>
              <span className={`mt-0.5 block truncate text-xs ${error ? 'text-red-300' : 'text-[#9CA3AF]'}`}>{status}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280] rtl:rotate-180" />
          </button>
          <button
            onClick={() => { if (confirming) { setConfirming(false); stopShare(); } else setConfirming(true); }}
            aria-label={t('share.stop')}
            className={`m-2 flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors ${confirming ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
          >
            <Square className="h-3 w-3 fill-current" />
            {confirming && t('share.tap_again')}
          </button>
        </div>
      </div>
      <ShareTripSheet open={open} onClose={() => setOpen(false)} tripId={session.tripId} from={session.from} to={session.to} />
    </>
  );
}
