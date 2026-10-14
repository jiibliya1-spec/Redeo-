import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  kind: 'time_change' | 'cancel';
  tripId: string;
  date: string;
  time: string;
  onClose: () => void;
  onSent: () => void;
}

/** The driver asks to change the departure time or cancel; Redeo staff approve or decline. */
export function TripChangeSheet({ open, kind, tripId, date, time, onClose, onSent }: Props) {
  const { t, dir } = useI18n();
  const [d, setD] = useState(date);
  const [tm, setTm] = useState(time);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const chips = ['tc.r_breakdown', 'tc.r_emergency', 'tc.r_weather', 'tc.r_schedule'];
  const today = new Date().toISOString().split('T')[0];
  const valid = reason.trim().length >= 3 && (kind === 'cancel' || (d && tm));

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('driver_request_trip_change', {
      p_trip: tripId, p_kind: kind, p_date: kind === 'time_change' ? d : null, p_time: kind === 'time_change' ? tm : null, p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      const m = error.message || '';
      toast.error(m.includes('already pending') ? t('tc.err_pending') : m.includes('past') ? t('tc.err_past') : t('tc.err'));
      return;
    }
    toast.success(t('tc.sent'));
    onSent();
    onClose();
  };

  const field = 'w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none focus:border-[#FF6B00]/50';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose} dir={dir}>
      <div className="w-full sm:max-w-sm bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{kind === 'cancel' ? t('tc.sheet_cancel') : t('tc.sheet_time')}</h3>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1 text-[#A0A0A0]"><X className="w-5 h-5" /></button>
        </div>
        {kind === 'time_change' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><p className="text-xs text-[#A0A0A0] mb-1">{t('tc.new_date')}</p><input type="date" min={today} value={d} onChange={(e) => setD(e.target.value)} className={field} /></div>
            <div><p className="text-xs text-[#A0A0A0] mb-1">{t('tc.new_time')}</p><input type="time" value={tm} onChange={(e) => setTm(e.target.value)} className={field} /></div>
          </div>
        )}
        <p className="text-xs text-[#A0A0A0] mb-2">{t('tc.reason')}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {chips.map((k) => (
            <button key={k} type="button" onClick={() => setReason(t(k))} className={`text-xs px-3 py-1.5 rounded-full border ${reason === t(k) ? 'border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10' : 'border-white/10 text-[#A0A0A0]'}`}>{t(k)}</button>
          ))}
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder={t('tc.reason_ph')}
          className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl p-3 text-sm outline-none focus:border-[#FF6B00]/50 resize-none" />
        <p className="text-[11px] text-[#A0A0A0] mt-2 mb-4">{t('tc.note_admin')}</p>
        <button onClick={send} disabled={!valid || busy}
          className={`w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center disabled:opacity-40 ${kind === 'cancel' ? 'bg-red-600' : 'bg-[#FF6B00]'}`}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : t('tc.send')}
        </button>
      </div>
    </div>
  );
}
