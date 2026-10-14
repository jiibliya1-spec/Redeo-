import { useEffect, useState, useCallback } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DriverWalletSheet } from '@/components/admin/DriverWalletSheet';

interface Wd { id: string; driver_id: string; amount: number; details: string; created_at: string; name?: string; phone?: string }
interface Stats { commissions: number; commissions_30d: number; topups: number; withdrawn: number; drivers_balance: number }
interface Req { id: string; driver_id: string; amount: number; method: string; reference: string | null; created_at: string; name?: string; phone?: string }

export function AdminWallet() {
  const { t } = useI18n();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState('0');
  const [note, setNote] = useState('');
  const [minBal, setMinBal] = useState('0');
  const [lowBal, setLowBal] = useState('50');
  const [wdOn, setWdOn] = useState(true);
  const [minWd, setMinWd] = useState('50');
  const [wds, setWds] = useState<Wd[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState('');
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone: string; balance: number }[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const loadDrivers = useCallback(async (term: string) => {
    const { data } = await supabase.rpc('admin_wallet_drivers', { p_q: term });
    setDrivers((data as any[]) || []);
  }, []);
  useEffect(() => { const id = setTimeout(() => loadDrivers(q.trim()), 250); return () => clearTimeout(id); }, [q, loadDrivers]);

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
    const { data: wr } = await supabase.from('withdrawal_requests').select('id,driver_id,amount,details,created_at').eq('status', 'pending').order('created_at');
    const wl = (wr as Wd[]) || [];
    if (wl.length) {
      const { data: ps } = await supabase.from('profiles').select('id,name,phone').in('id', wl.map((r) => r.driver_id));
      const m = new Map((ps || []).map((p: any) => [p.id, p]));
      wl.forEach((r) => { const p: any = m.get(r.driver_id); r.name = p?.name; r.phone = p?.phone; });
    }
    setWds(wl);
    const { data: sj } = await supabase.rpc('admin_wallet_stats');
    if (sj) setStats(sj as Stats);
    for (const r of (st as { key: string; value: any }[]) || []) {
      if (r.key === 'commission') { setEnabled(!!r.value?.enabled); setPct(String(r.value?.pct ?? 0)); setMinBal(String(r.value?.min_balance ?? 0)); setLowBal(String(r.value?.low_balance ?? 50)); setWdOn(r.value?.withdrawals !== false); setMinWd(String(r.value?.min_withdraw ?? 0)); }
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

  const reviewWd = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_review_withdrawal', { p_id: id, p_approve: approve });
    setBusy(null);
    if (error) { toast.error(error.message.includes('insufficient') ? t('wallet.wd_insufficient') : t('err.generic')); return; }
    load();
  };

  const save = async () => {
    const n = Math.min(30, Math.max(0, Number(pct.replace(',', '.')) || 0));
    const a = await supabase.from('platform_settings').upsert({ key: 'commission', value: { enabled, pct: n, min_balance: Math.max(0, Number(minBal.replace(',', '.')) || 0), low_balance: Math.max(0, Number(lowBal.replace(',', '.')) || 0), withdrawals: wdOn, min_withdraw: Math.max(0, Number(minWd.replace(',', '.')) || 0) }, updated_at: new Date().toISOString() });
    const b = await supabase.from('platform_settings').upsert({ key: 'wallet_topup_info', value: { methods: [], note: note.trim() }, updated_at: new Date().toISOString() });
    if (a.error || b.error) toast.error(t('err.generic')); else { setPct(String(n)); toast.success(t('adm.saved')); }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">{t('adm.wallet')}</h2>

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: t('adm.stat_commissions'), v: stats.commissions, hi: true },
              { l: t('adm.stat_commissions_30'), v: stats.commissions_30d },
              { l: t('adm.stat_topups'), v: stats.topups },
              { l: t('adm.stat_balance'), v: stats.drivers_balance },
              { l: t('adm.stat_withdrawn'), v: stats.withdrawn },
            ].map((c) => (
              <div key={c.l} className={`rounded-2xl border p-4 ${c.hi ? 'bg-[#FF6B00]/10 border-[#FF6B00]/30' : 'bg-[#111318] border-white/5'}`}>
                <p className="text-xs text-[#A0A0A0]">{c.l}</p>
                <p className="text-xl font-bold text-white mt-1" dir="ltr">{Number(c.v).toFixed(2)} <span className="text-xs font-medium text-[#A0A0A0]">MAD</span></p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#111318] rounded-2xl border border-[#FF6B00]/30 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('adm.credit_title')}</h3>
          <p className="text-[11px] text-[#A0A0A0]">{t('dw.tap_hint')}</p>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm.credit_search')} className="bg-[#0F1115] border-white/10 text-white" />
          <div className="max-h-72 overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5">
            {drivers.length === 0 ? <p className="text-xs text-[#A0A0A0] p-3">{t('adm.credit_none')}</p> : drivers.map((d) => (
              <button key={d.id} onClick={() => setOpen(d.id)} className="w-full flex items-center justify-between gap-3 p-3 text-start hover:bg-white/5 active:bg-white/10">
                <span className="min-w-0"><span className="block text-sm text-white truncate">{d.name || t('adm.unknown')}</span><span className="block text-[11px] text-[#A0A0A0]" dir="ltr">{d.phone}</span></span>
                <span className="text-sm font-semibold text-white shrink-0" dir="ltr">{Number(d.balance).toFixed(2)} MAD</span>
              </button>
            ))}
          </div>
        </div>

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
            <p className="text-xs text-[#A0A0A0] mb-1">{t('adm.min_balance')}</p>
            <Input value={minBal} onChange={(e) => setMinBal(e.target.value)} inputMode="decimal" dir="ltr" className="bg-[#0F1115] border-white/10 text-white w-32" />
          </div>
          <div>
            <p className="text-xs text-[#A0A0A0] mb-1">{t('adm.low_balance')}</p>
            <Input value={lowBal} onChange={(e) => setLowBal(e.target.value)} inputMode="decimal" dir="ltr" className="bg-[#0F1115] border-white/10 text-white w-32" />
          </div>
          <label className="flex items-center justify-between text-sm text-[#A0A0A0]">
            {t('adm.wd_enable')}
            <input type="checkbox" checked={wdOn} onChange={(e) => setWdOn(e.target.checked)} className="w-5 h-5 accent-[#FF6B00]" />
          </label>
          <div>
            <p className="text-xs text-[#A0A0A0] mb-1">{t('adm.wd_min')}</p>
            <Input value={minWd} onChange={(e) => setMinWd(e.target.value)} inputMode="decimal" dir="ltr" className="bg-[#0F1115] border-white/10 text-white w-32" />
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

        <div className="bg-[#111318] rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white">{t('adm.wd_pending')}</h3>
          <p className="text-[11px] text-yellow-400 mb-3">{t('adm.wd_paid_hint')}</p>
          {wds.length === 0 ? <p className="text-xs text-[#A0A0A0]">{t('adm.wallet_none')}</p> : wds.map((r) => (
            <div key={r.id} className="py-3 border-t border-white/5 first:border-0 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{r.name || t('adm.unknown')}{r.phone ? ` · ${r.phone}` : ''}</p>
                <p className="text-xs text-[#A0A0A0] break-all" dir="ltr">{Number(r.amount).toFixed(2)} MAD · {r.details}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" disabled={busy === r.id} onClick={() => reviewWd(r.id, true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg"><Check className="w-4 h-4" /></Button>
                <Button size="sm" disabled={busy === r.id} onClick={() => reviewWd(r.id, false)} className="bg-red-600/80 hover:bg-red-700 text-white rounded-lg"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {open && <DriverWalletSheet driverId={open} onClose={() => setOpen(null)} onChanged={() => { loadDrivers(q.trim()); load(); }} />}
    </AdminLayout>
  );
}
