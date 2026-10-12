import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { passengerChecks } from '@/lib/verify';

export function PassengerVerification() {
  const { user } = useStore();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const c = passengerChecks(user);
  const items = [
    { ok: c.photo, label: t('verify.chk_photo'), hint: c.photo ? '' : t('verify.chk_photo_hint') },
    { ok: c.phone, label: t('verify.chk_phone'), hint: c.phone ? user?.phone || '' : '' },
    { ok: c.name, label: t('verify.chk_name'), hint: c.name ? user?.name || '' : '' },
  ];
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24" dir={dir}>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${c.complete ? 'bg-green-500/10' : 'bg-[#FF6B00]/10'}`}>
            <ShieldCheck className={`w-8 h-8 ${c.complete ? 'text-green-400' : 'text-[#FF6B00]'}`} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{c.complete ? t('verify.all_done_title') : t('verify.basic_title')}</h1>
          <p className="text-sm text-[#A0A0A0]">{c.complete ? t('verify.all_done_desc') : t('verify.basic_desc')}</p>
        </div>

        <div className="bg-[#1B1F27] border border-white/10 rounded-2xl divide-y divide-white/5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-3 p-4">
              {it.ok ? <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" /> : <Circle className="w-6 h-6 text-white/20 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{it.label}</p>
                {it.hint && <p className="text-xs text-[#A0A0A0] truncate">{it.hint}</p>}
              </div>
              {it.ok ? (
                <span className="text-xs text-green-400">{t('verify.done')}</span>
              ) : (
                <button onClick={() => navigate('/profile')} className="text-xs font-semibold text-white bg-[#FF6B00] hover:bg-[#E56000] px-4 py-2 rounded-lg">{t('verify.complete_btn')}</button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1"><Car className="w-4 h-4 text-[#FF6B00]" /><p className="text-sm font-semibold text-[#FF6B00]">{t('verify.driver_cta_title')}</p></div>
          <p className="text-xs text-[#A0A0A0] leading-relaxed mb-4">{t('verify.driver_cta_desc')}</p>
          <button onClick={() => navigate('/settings')} className="w-full h-11 rounded-xl border border-[#FF6B00]/40 text-[#FF6B00] text-sm font-semibold hover:bg-[#FF6B00]/10">{t('verify.driver_cta_btn')}</button>
        </div>
      </div>
    </div>
  );
}
