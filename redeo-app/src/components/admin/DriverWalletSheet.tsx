import { useCallback, useEffect, useState } from 'react';
import { Loader2, X, ArrowDownLeft, ArrowUpRight, RotateCcw, SlidersHorizontal, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Tx { id: string; kind: string; amount: number; note: string | null; created_at: string; from: string | null; to: string | null; date: string | null; passenger: string | null; price: number | null }
interface Data {
  driver: { id: string; name: string | null; phone: string | null; created_at: string };
  balance: number; topups: number; commissions: number; withdrawn: number; adjust: number; bookings: number; first_at: string | null; tx: Tx[];
}

const money = (n: number) => `${Number(n).toFixed(2)}`;

/** One driver's wallet archive for the admin: totals, every top-up / commission / withdrawal, and a form to credit the driver. */
export function DriverWalletSheet({ driverId, onClose, onChanged }: { driverId: string; onClose: () => void; onChanged: () => void }) {
  const { t, dir, lang } = useI18n();
  const city = useCity();
  const [d, setD] = useState<Data | null>(null);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_driver_wallet', { p_driver: driverId });
    if (error || !data) { toast.error(t('dw.err')); onClose(); return; }
    setD(data as Data);
  }, [driverId, onClose, t]);
  useEffect(() => { load(); }, [load]);

  const credit = async () => {
    const n = Number(amt.replace(',', '.'));
    if (!n || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_credit_driver', { p_driver: driverId, p_amount: n, p_note: note.trim() || null });
    setBusy(false);
    if (error) { toast.error(t('err.generic')); return; }
    toast.success(t('adm.credit_done'));
    setAmt(''); setNote('');
    load(); onChanged();
  };

  const fmtDate = (s: string) => new Date(s).toLocaleString(lang === 'ar' ? 'ar-MA-u-nu-latn' : lang, { dateStyle: 'medium', timeStyle: 'short' });
  const kindIcon = (k: string) => k === 'topup' ? ArrowDownLeft : k === 'commission' ? ArrowUpRight : k === 'refund' ? RotateCcw : k === 'withdraw' ? Banknote : SlidersHorizontal;

  const stats = d ? [
    { l: t('dw.topups'), v: d.topups },
    { l: t('dw.commissions'), v: d.commissions },
    { l: t('dw.withdrawn'), v: d.withdrawn },
    { l: t('dw.bookings'), v: d.bookings, plain: true },
  ] : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose} dir={dir}>
      <div className="w-full sm:max-w-lg bg-[#0F1115] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="min-w-0">
            <p className="text-[11px] text-[#A0A0A0]">{t('dw.title')}</p>
            <p className="text-lg font-bold text-white truncate">{d?.driver?.name || '…'}</p>
            {d?.driver?.phone && <p className="text-xs text-[#A0A0A0]" dir="ltr">{d.driver.phone}</p>}
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="p-2 text-[#A0A0A0]"><X className="w-5 h-5" /></button>
        </div>
        {!d ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" /></div> : (
          <div className="overflow-y-auto p-4 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#E05A00] p-5">
              <p className="text-white/80 text-sm">{t('dw.balance')}</p>
              <p className="text-4xl font-bold text-white mt-1" dir="ltr">{money(d.balance)} <span className="text-lg font-medium">MAD</span></p>
              {d.first_at && <p className="text-[11px] text-white/70 mt-2">{t('dw.member')} {fmtDate(d.first_at)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((c) => (
                <div key={c.l} className="rounded-2xl bg-[#111318] border border-white/5 p-3">
                  <p className="text-[11px] text-[#A0A0A0]">{c.l}</p>
                  <p className="text-lg font-bold text-white mt-0.5" dir="ltr">{c.plain ? c.v : `${money(c.v)} MAD`}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-[#111318] border border-[#FF6B00]/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-white">{t('dw.add')}</p>
              <Input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" dir="ltr" placeholder={t('adm.credit_amount')} className="bg-[#0F1115] border-white/10 text-white" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('adm.credit_note')} className="bg-[#0F1115] border-white/10 text-white" />
              <p className="text-[11px] text-[#A0A0A0]">{t('adm.credit_hint')}</p>
              <Button onClick={credit} disabled={!Number(amt.replace(',', '.')) || busy} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('adm.credit_btn')}
              </Button>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">{t('dw.history')}</p>
              {d.tx.length === 0 ? <p className="text-xs text-[#A0A0A0]">{t('dw.empty')}</p> : (
                <div className="rounded-2xl bg-[#111318] border border-white/5 divide-y divide-white/5">
                  {d.tx.map((x) => {
                    const Icon = kindIcon(x.kind);
                    const plus = x.amount > 0;
                    return (
                      <div key={x.id} className="p-3 flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${plus ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}><Icon className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white">{t(`dw.k_${x.kind}`)}</p>
                          {x.from && <p className="text-xs text-[#A0A0A0]">{city(x.from)} → {city(x.to)}{x.date ? ` · ${x.date}` : ''}</p>}
                          {x.passenger && <p className="text-[11px] text-[#6B7280]">{t('dw.passenger')}: {x.passenger}{x.price != null ? ` · ${money(x.price)} MAD` : ''}</p>}
                          {x.note && !x.from && <p className="text-[11px] text-[#6B7280] break-words">{x.note}</p>}
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{fmtDate(x.created_at)}</p>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${plus ? 'text-green-400' : 'text-red-400'}`} dir="ltr">{plus ? '+' : ''}{money(x.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
