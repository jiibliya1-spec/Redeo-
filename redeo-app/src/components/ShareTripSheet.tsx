import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Loader2, MapPinned, Share2, ShieldCheck, Smartphone, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { shareUrl, startShare, stopShare, useShare } from '@/lib/tripShare';

interface Props { open: boolean; onClose: () => void; tripId: string; from: string; to: string }

export function ShareTripSheet({ open, onClose, tripId, from, to }: Props) {
  const { t, dir } = useI18n();
  const city = useCity();
  const session = useShare((s) => s.session);
  const error = useShare((s) => s.error);
  const lastSentAt = useShare((s) => s.lastSentAt);
  const [busy, setBusy] = useState(false);

  const mine = session && session.tripId === tripId ? session : null;
  const other = session && session.tripId !== tripId;
  const link = mine ? shareUrl(mine.token) : '';
  const text = t('share.msg', { from: city(from), to: city(to) });

  const start = async () => {
    setBusy(true);
    try {
      if (!('geolocation' in navigator)) { toast.error(t('share.err_unavailable')); return; }
      await startShare(tripId, city(from), city(to));
    } catch {
      toast.error(t('share.err_generic'));
    } finally { setBusy(false); }
  };

  const send = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Redeo', text, url: link }); return; }
    } catch { return; /* user cancelled */ }
    copy();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text} ${link}`); toast.success(t('share.copied')); } catch { toast.error(link); }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, '_blank', 'noopener');

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose} dir={dir}>
          <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><MapPinned className="w-5 h-5 text-[#FF6B00]" /></div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white">{t('share.title')}</h2>
                  <p className="text-xs text-[#A0A0A0] truncate">{city(from)} → {city(to)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 text-[#A0A0A0] hover:text-white" aria-label="close"><X className="w-5 h-5" /></button>
            </div>

            {!mine ? (
              <>
                <p className="text-sm text-white/90 leading-relaxed mb-4">{t('share.desc')}</p>
                <div className="space-y-2.5 mb-5">
                  <div className="flex gap-2.5 text-xs text-[#A0A0A0] leading-relaxed"><ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /><span>{t('share.privacy')}</span></div>
                  <div className="flex gap-2.5 text-xs text-[#A0A0A0] leading-relaxed"><Smartphone className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" /><span>{t('share.keep_open')}</span></div>
                </div>
                {other && <p className="text-xs text-yellow-400 mb-3">{session.from} → {session.to}: {t('share.banner')}</p>}
                <Button onClick={start} disabled={busy} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-12 font-semibold">
                  {busy ? <><Loader2 className="w-4 h-4 animate-spin me-2" />{t('share.starting')}</> : t('share.start')}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-green-400 animate-ping" /><span className="relative w-2.5 h-2.5 rounded-full bg-green-400" /></span>
                  <p className="text-sm font-semibold text-green-400">{t('share.live')}</p>
                  <p className="text-xs text-[#A0A0A0] ms-auto">
                    {error === 'denied' ? t('share.err_denied') : error === 'unavailable' ? t('share.err_unavailable')
                      : lastSentAt ? t('share.last_sent', { s: Math.max(0, Math.round((Date.now() - lastSentAt) / 1000)) }) : t('share.gps_wait')}
                  </p>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/5 px-3 py-2.5 text-xs text-[#A0A0A0] break-all mb-3" dir="ltr">{link}</div>
                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  <Button onClick={send} className="bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-11"><Share2 className="w-4 h-4 me-2" />{t('share.send_link')}</Button>
                  <Button onClick={whatsapp} variant="outline" className="border-green-500/40 text-green-400 hover:bg-green-500/10 rounded-xl h-11">WhatsApp</Button>
                </div>
                <Button onClick={copy} variant="outline" className="w-full border-white/10 text-white rounded-xl h-11 mb-2.5"><Copy className="w-4 h-4 me-2" />{t('share.copy')}</Button>
                <p className="text-[11px] text-[#A0A0A0] leading-relaxed mb-4">{t('share.keep_open')}</p>
                <Button onClick={async () => { await stopShare(); toast.success(t('share.stopped')); onClose(); }} variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-11">
                  <Square className="w-3.5 h-3.5 me-2 fill-current" />{t('share.stop')}
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
