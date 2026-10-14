import { useCallback, useEffect, useState } from 'react';
import { Check, X, Loader2, Clock, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { Button } from '@/components/ui/button';

interface Req {
  id: string; kind: 'time_change' | 'cancel'; reason: string; old_date: string; old_time: string; new_date: string | null; new_time: string | null;
  from_location: string; to_location: string; affected_bookings: number; driver_name: string | null; driver_phone: string | null; created_at: string;
}

/** Pending driver requests to change the departure time or cancel a trip: the admin approves or declines. */
export function TripChangeRequests({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const city = useCity();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('trip_change_requests').select('*').eq('status', 'pending').order('created_at');
    setReqs((data as Req[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel('admin-trip-req').on('postgres_changes', { event: '*', schema: 'public', table: 'trip_change_requests' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_review_trip_change', { p_id: id, p_approve: approve, p_note: notes[id] || null });
    setBusy(null);
    if (error) { toast.error(t('tc.adm_err')); load(); return; }
    toast.success(t('tc.adm_done'));
    load(); onChanged?.();
  };

  if (loading || reqs.length === 0) {
    return loading ? null : (
      <div className="mb-6 rounded-2xl border border-white/5 bg-[#111318] p-4">
        <h3 className="text-sm font-semibold text-white mb-1">{t('tc.adm_title')}</h3>
        <p className="text-xs text-[#A0A0A0]">{t('tc.adm_none')}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#FF6B00]/30 bg-[#111318] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">{t('tc.adm_title')} <span className="ms-1 text-xs px-2 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FF6B00]">{reqs.length}</span></h3>
      {reqs.map((r) => (
        <div key={r.id} className="rounded-xl bg-[#0F1115] border border-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.kind === 'cancel' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {r.kind === 'cancel' ? <Ban className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{r.kind === 'cancel' ? t('tc.adm_cancel') : t('tc.adm_time')}
            </span>
            <span className="text-[11px] text-[#A0A0A0]">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-white">{city(r.from_location)} → {city(r.to_location)}</p>
          <p className="text-xs text-[#A0A0A0]" dir="ltr">{r.old_date} {r.old_time}{r.kind === 'time_change' ? `  →  ${r.new_date} ${r.new_time}` : ''}</p>
          <p className="text-xs text-white/90">{r.driver_name || '—'}{r.driver_phone ? ` · ${r.driver_phone}` : ''} · {t('tc.adm_affected', { n: r.affected_bookings })}</p>
          <p className="text-xs text-[#FF6B00]">{t('tc.adm_reason')}: <span className="text-white/90">{r.reason}</span></p>
          <input value={notes[r.id] || ''} onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))} placeholder={t('tc.adm_note')}
            className="w-full bg-[#1B1F27] border border-white/10 text-white rounded-lg h-9 px-3 text-xs outline-none" />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 me-1" />{t('tc.adm_approve')}</>}
            </Button>
            <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, false)} className="flex-1 bg-red-600/80 hover:bg-red-700 text-white rounded-lg"><X className="w-4 h-4 me-1" />{t('tc.adm_reject')}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
