import { useState } from 'react';
import { Phone, X, Siren } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const NUMBERS: { n: string; k: string }[] = [
  { n: '19', k: 'sos.police' },
  { n: '177', k: 'sos.gendarmerie' },
  { n: '150', k: 'sos.ambulance' },
  { n: '15', k: 'sos.civil' },
];

/** Floating SOS button + bottom sheet listing Moroccan emergency numbers. */
export function SosButton({ className = '' }: { className?: string }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 shadow-lg ${className}`}
        aria-label={t('sos.title')}
      >
        <Siren className="w-4 h-4" /> {t('sos.btn')}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div dir={dir} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[#1B1F27] rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">{t('sos.title')}</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/5"><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="space-y-2">
              {NUMBERS.map((x) => (
                <a key={x.n} href={`tel:${x.n}`} className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-white">
                  <Phone className="w-5 h-5 text-red-400" />
                  <span className="flex-1 text-sm font-medium">{t(x.k)}</span>
                  <span className="text-xl font-bold text-red-400" dir="ltr">{x.n}</span>
                </a>
              ))}
            </div>
            <p className="text-xs text-[#A0A0A0] mt-3">{t('sos.hint')}</p>
          </div>
        </div>
      )}
    </>
  );
}
