import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Tx { id: string; kind: string; amount: number; created_at: string }
interface Wd { id: string; amount: number; status: string; created_at: string }
interface Req { id: string; amount: number; method: string; status: string; created_at: string }

const METHODS = ['bank', 'Wafacash', 'Cash Plus', 'other'] as const;

export function WalletPage() {
  const { t } = useI18n();
  const user = useStore((s) => s.user);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [commission, setCommission] = useState<{ enabled: boolean; pct: number; min: number; wd: boolean; minWd: number }>({ enabled: false, pct: 0, min: 0, wd: true, minWd: 0 });
  const [wds, setWds] = useState<Wd[]>([]);
  const [wdAmount, setWdAmount] = useState('');
  const [wdDetails, setWdDetails] = useState('');
  const [wdSending, setWdSending] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('bank');
  const [reference, setReference] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [w, tx, rq, st, wr] = await Promise.all([
      supabase.from('driver_wallets').select('balance').eq('driver_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('id,kind,amount,created_at').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('topup_requests').select('id,amount,method,status,created_at').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('platform_settings').select('key,value').in('key', ['commission', 'wallet_topup_info']),
      supabase.from('withdrawal_requests').select('id,amount,status,created_at').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setWds((wr.data as Wd[]) || []);
    setBalance(Number(w.data?.balance ?? 0));
    setTxs((tx.data as Tx[]) || []);
    setReqs((rq.data as Req[]) || []);
    for (const r of (st.data as { key: string; value: any }[]) || []) {
      if (r.key === 'commission') setCommission({ enabled: !!r.value?.enabled, pct: Number(r.value?.pct || 0), min: Number(r.value?.min_balance || 0), wd: r.value?.withdrawals !== false, minWd: Number(r.value?.min_withdraw || 0) });
      if (r.key === 'wallet_topup_info') setNote(String(r.value?.note || ''));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const n = Number(amount.replace(',', '.'));
    if (!user?.id || !isFinite(n) || n <= 0 || n > 100000) { toast.error(t('wallet.bad_amount')); return; }
    setSending(true);
    const { error } = await supabase.from('topup_requests').insert({
      driver_id: user.id, amount: n, method, reference: reference.trim() || null,
    });
    setSending(false);
    if (error) { toast.error(t('err.generic')); return; }
    toast.success(t('wallet.sent'));
    setAmount(''); setReference('');
    load();
  };

  const submitWd = async () => {
    const n = Number(wdAmount.replace(',', '.'));
    if (!user?.id || !isFinite(n) || n <= 0 || !wdDetails.trim()) { toast.error(t('wallet.bad_amount')); return; }
    setWdSending(true);
    const { error } = await supabase.from('withdrawal_requests').insert({ driver_id: user.id, amount: n, details: wdDetails.trim() });
    setWdSending(false);
    if (error) {
      const m = error.message || '';
      toast.error(m.includes('insufficient') ? t('wallet.wd_insufficient') : m.includes('below_min') ? t('wallet.wd_below_min') : m.includes('disabled') ? t('wallet.wd_off') : t('err.generic'));
      return;
    }
    toast.success(t('wallet.wd_sent'));
    setWdAmount(''); setWdDetails('');
    load();
  };

  const kindLabel = (k: string) => t(`wallet.k_${k}`);
  const statusStyle = (s: string) =>
    s === 'approved' ? 'bg-green-500/10 text-green-400' : s === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400';
  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      <div className="max-w-xl mx-auto px-4 space-y-5">
        <h1 className="text-xl font-bold text-white">{t('wallet.title')}</h1>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-gradient-to-br from-[#FF6B00] to-[#E56000]">
          <div className="flex items-center gap-2 text-white/80 text-sm"><Wallet className="w-4 h-4" />{t('wallet.balance')}</div>
          <p className="text-4xl font-bold text-white mt-2" dir="ltr">{loading ? '…' : balance.toFixed(2)} <span className="text-lg font-medium">MAD</span></p>
        </motion.div>

        <p className="text-xs text-[#A0A0A0] bg-[#1B1F27] border border-white/5 rounded-xl p-3">
          {commission.enabled && commission.pct > 0 ? t('wallet.commission_on', { pct: commission.pct }) : t('wallet.free_now')}
        </p>

        {commission.enabled && commission.min > 0 && (
          <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">{t('wallet.min_notice', { min: commission.min })}</p>
        )}

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">{t('wallet.topup_title')}</h2>
          <p className="text-xs text-[#A0A0A0]">{t('wallet.topup_desc')}</p>
          {note && <p className="text-xs text-white/80 whitespace-pre-line bg-white/5 rounded-xl p-3">{note}</p>}
          <div>
            <Label className="text-xs text-[#A0A0A0]">{t('wallet.amount')}</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr" className="mt-1 bg-[#0F1115] border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-xs text-[#A0A0A0]">{t('wallet.method')}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`px-3 py-2 rounded-xl text-xs border ${method === m ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-white/10 text-[#A0A0A0]'}`}>
                  {m === 'bank' ? t('wallet.m_bank') : m === 'other' ? t('wallet.m_other') : m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#A0A0A0]">{t('wallet.reference')}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" className="mt-1 bg-[#0F1115] border-white/10 text-white" />
          </div>
          <Button onClick={submit} disabled={sending} className="w-full h-12 rounded-xl bg-[#FF6B00] hover:bg-[#E56000] text-white">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('wallet.send')}
          </Button>
        </div>

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">{t('wallet.wd_title')}</h2>
          {!commission.wd ? <p className="text-xs text-[#A0A0A0]">{t('wallet.wd_off')}</p> : (<>
            <p className="text-xs text-[#A0A0A0]">{t('wallet.wd_desc', { min: commission.minWd })}</p>
            <div>
              <Label className="text-xs text-[#A0A0A0]">{t('wallet.amount')}</Label>
              <Input value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} inputMode="decimal" dir="ltr" className="mt-1 bg-[#0F1115] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-xs text-[#A0A0A0]">{t('wallet.wd_details')}</Label>
              <Input value={wdDetails} onChange={(e) => setWdDetails(e.target.value)} dir="ltr" className="mt-1 bg-[#0F1115] border-white/10 text-white" />
            </div>
            <Button onClick={submitWd} disabled={wdSending} variant="outline" className="w-full h-12 rounded-xl border-[#FF6B00] text-[#FF6B00] bg-transparent hover:bg-[#FF6B00]/10">
              {wdSending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('wallet.wd_send')}
            </Button>
          </>)}
          {wds.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-[#A0A0A0] mb-1">{t('wallet.wd_requests')}</p>
              {wds.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-t border-white/5">
                  <div><p className="text-sm text-white" dir="ltr">{Number(r.amount).toFixed(2)} MAD</p><p className="text-[11px] text-[#A0A0A0]">{fmt(r.created_at)}</p></div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full ${statusStyle(r.status)}`}>{t(`wallet.st_${r.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">{t('wallet.requests')}</h2>
          {reqs.length === 0 ? <p className="text-xs text-[#A0A0A0]">{t('wallet.empty')}</p> : reqs.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2.5 border-t border-white/5 first:border-0">
              <div><p className="text-sm text-white" dir="ltr">{Number(r.amount).toFixed(2)} MAD</p><p className="text-[11px] text-[#A0A0A0]">{fmt(r.created_at)}</p></div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${statusStyle(r.status)}`}>{t(`wallet.st_${r.status}`)}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">{t('wallet.history')}</h2>
          {txs.length === 0 ? <p className="text-xs text-[#A0A0A0]">{t('wallet.empty')}</p> : txs.map((x) => (
            <div key={x.id} className="flex items-center justify-between py-2.5 border-t border-white/5 first:border-0">
              <div className="flex items-center gap-2.5">
                {x.amount >= 0 ? <ArrowDownLeft className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                <div><p className="text-sm text-white">{kindLabel(x.kind)}</p><p className="text-[11px] text-[#A0A0A0]">{fmt(x.created_at)}</p></div>
              </div>
              <p className={`text-sm font-semibold ${x.amount >= 0 ? 'text-green-400' : 'text-red-400'}`} dir="ltr">{x.amount >= 0 ? '+' : ''}{Number(x.amount).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
