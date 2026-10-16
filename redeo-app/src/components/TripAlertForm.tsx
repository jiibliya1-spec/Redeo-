import { useState } from 'react';
import { Bell, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

/** Normalises a Moroccan number (06…/07…/+212…) to digits with country code. */
function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s\-().]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (/^0[5-7]\d{8}$/.test(d)) d = '+212' + d.slice(1);
  else if (/^212\d{9}$/.test(d)) d = '+' + d;
  return /^\+?\d{8,15}$/.test(d) ? d : null;
}

/** "Notify me when a ride appears" — shown when a search returns nothing. */
export function TripAlertForm({ from, to }: { from: string; to: string }) {
  const { t, dir } = useI18n();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!from || !to) { toast.error(t('alert.pick_route')); return; }
    const p = normalizePhone(phone);
    if (!p) { toast.error(t('alert.bad_phone')); return; }
    setBusy(true);
    const { error } = await supabase.from('trip_alerts').insert({ phone: p, from_location: from, to_location: to });
    setBusy(false);
    if (error) { toast.error(t('alert.err')); return; }
    setDone(true);
  };

  return (
    <div dir={dir} className="mt-4 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/5 p-4 text-start">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-[#FF6B00]" />
        <h4 className="text-sm font-semibold text-white">{t('alert.title')}</h4>
      </div>
      {done ? (
        <p className="flex items-center gap-2 text-sm text-green-400"><Check className="w-4 h-4" />{t('alert.done')}</p>
      ) : (
        <>
          <p className="text-xs text-[#A0A0A0] mb-3">{t('alert.desc')}</p>
          <div className="flex gap-2">
            <input
              type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder={t('alert.phone_ph')}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[#0F1115] border border-white/10 text-white text-sm outline-none"
            />
            <button onClick={submit} disabled={busy} className="h-10 px-4 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('alert.submit')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
