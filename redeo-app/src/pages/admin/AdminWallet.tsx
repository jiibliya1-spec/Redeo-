import { useEffect, useState, useCallback } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Req { id: string; driver_id: string; amount: number; method: string; reference: string | null; created_at: string; name?: string; phone?: string }

export function AdminWallet() {
  const { t } = useI18n();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState('0');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const [{ data: rq }, { data: st }] = await Promise.all([
      supabase.from('topup_requests').select('id,driver_id,amount,method,reference,created_at').eq('status', 'pending').order('created_at'),
      supabase.from('platform_settings').select('key,value').in('key', ['commission', 'wallet_topup_info']),
    ]);
    const list = (rq as Req[]) || [];
    if (list.length) {
      const { data: ps } = await supabase.from('profiles').select('id,name,phone').in('id', list.map((r) => r.driver_id));
      const m = new Map((ps || []).map((p: any) => [p.id, p]));
      list.forEach((r) => { const p: any = m.get(r.driver_id); r.name = p?.name; r.phone = p?.phone; });
    }
    setReqs(list);
    for (const r of (st as { key: string; value: any }[]) || []) {
      if (r.key === 'commission') { setEnabled(!!r.value?.enabled); setPct(String(r.value?.pct ?? 0)); }
      if (r.key === 'wallet_topup_info') setNote(String(r.value?.note || ''));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_review_topup', { p_id: id, p_approve: approve });
    setBusy(null);
    if (error) { toast.error(t('err.generic')); return; }
    setReqs((p) => p.filter((r) => r.id !== id));
  };

  const save = async () => {
    const n = Math.min(30, Math.max(0, Number(pct.replace(',', '.')) || 0));
    const a = await supabase.from('platform_settings').upsert({ key: 'commission', value: { enabled, pct: n }, updated_at: new Date().toISOString() });
    const b = await supabase.from('platform_settings').upsert({ key: 'wallet_topup_info', value: { methods: [], note: note.trim() }, updated_at: new Date().toISOString() });
    if (a.error || b.error) toast.error(t('err.generic')); else { setPct(String(n)); toast.success(t('adm.saved')); }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">{t('adm.wallet')}</h2>

        <div className="bg-[#111318] rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('adm.commission_title')}</h3>
          <label className="flex items-center justify-between text-sm text-[#A0A0A0]">
            {t('adm.commission_enable')}
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-5 h-5 accent-[#FF6B00]" />
          </label>
          <div>
            <p className="text-xs text-[#A0A0A0] mb-1">{t('adm.commission_pct')}</p>
            <Input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" dir="ltr" className="bg-[#0F1115] border-white/10 text-white w-32" />
          </div>
          <div>
            <p className="text-xs text-[#A0A0A0] mb-1">{t('adm.topup_note')}</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="w-full rounded-xl bg-[#0F1115] border border-white/10 text-white text-sm p-3" />
          </div>
          <Button onClick={save} className="bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">{t('adm.save')}</Button>
        </div>

        <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">{t('adm.wallet_topups')}</h3>
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" /> : reqs.length === 0 ? (
            <p className="text-xs text-[#A0A0A0]">{t('adm.wallet_none')}</p>
          ) : reqs.map((r) => (
            <div key={r.id} className="py-3 border-t border-white/5 first:border-0 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{r.name || t('adm.unknown')}{r.phone ? ` · ${r.phone}` : ''}</p>
                <p className="text-xs text-[#A0A0A0]" dir="ltr">{Number(r.amount).toFixed(2)} MAD · {r.method}{r.reference ? ` · ${r.reference}` : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg"><Check className="w-4 h-4" /></Button>
                <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, false)} className="bg-red-600/80 hover:bg-red-700 text-white rounded-lg"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
