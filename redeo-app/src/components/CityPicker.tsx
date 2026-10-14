import { useMemo, useState } from 'react';
import { ChevronDown, Search, X, Plus, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { MOROCCAN_CITY_KEYS, MAJOR_CITY_COUNT, canonicalCity, cityLabel, cityMatches } from '@/lib/cities';

interface Props {
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  className?: string;
  exclude?: string;
  /** Lets the user write a place that is not in the list (drivers publishing a trip, passengers searching). */
  allowCustom?: boolean;
  required?: boolean;
}

/** Searchable city picker: ~130 Moroccan cities in any language, plus "use what I typed" for places not listed. */
export function CityPicker({ value, onChange, placeholder, className, exclude, allowCustom = true }: Props) {
  const { t, lang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const keys = MOROCCAN_CITY_KEYS.filter((k) => k !== exclude && cityMatches(k, q));
    if (q.trim()) return keys.sort((a, b) => cityLabel(a, lang).localeCompare(cityLabel(b, lang), lang));
    const majors = keys.slice(0, MAJOR_CITY_COUNT).filter((k) => MOROCCAN_CITY_KEYS.indexOf(k) < MAJOR_CITY_COUNT);
    const rest = keys.filter((k) => MOROCCAN_CITY_KEYS.indexOf(k) >= MAJOR_CITY_COUNT)
      .sort((a, b) => cityLabel(a, lang).localeCompare(cityLabel(b, lang), lang));
    return [...majors, ...rest];
  }, [q, exclude, lang]);

  const typed = canonicalCity(q);
  const showCustom = allowCustom && q.trim().length >= 2 && !MOROCCAN_CITY_KEYS.includes(typed) && typed !== exclude;

  const pick = (k: string) => { onChange(k); setOpen(false); setQ(''); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${className || ''} flex items-center justify-between gap-2 text-start`}>
        <span className={`truncate ${value ? '' : 'text-[#6B7280]'}`}>{value ? cityLabel(value, lang) : placeholder}</span>
        <ChevronDown className="w-4 h-4 text-[#6B7280] shrink-0" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOpen(false)} dir={dir}>
          <div className="w-full sm:max-w-md bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 pb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#6B7280] absolute top-1/2 -translate-y-1/2 start-3" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('city.search')}
                  className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 ps-9 pe-3 text-sm outline-none focus:border-[#FF6B00]/50" />
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')} className="p-2 text-[#A0A0A0]"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto px-2 pb-4">
              {showCustom && (
                <button type="button" onClick={() => pick(typed)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-start mb-1">
                  <Plus className="w-4 h-4 text-[#FF6B00] shrink-0" />
                  <span className="text-sm text-white">{t('city.use_typed', { name: typed })}</span>
                </button>
              )}
              {value && (
                <button type="button" onClick={() => pick('')} className="w-full p-3 text-xs text-[#A0A0A0] text-start">{t('city.clear')}</button>
              )}
              {list.map((k) => (
                <button key={k} type="button" onClick={() => pick(k)} className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 text-start">
                  <span className="text-sm text-white">{cityLabel(k, lang)}</span>
                  {value === k && <Check className="w-4 h-4 text-[#FF6B00]" />}
                </button>
              ))}
              {list.length === 0 && !showCustom && <p className="text-xs text-[#A0A0A0] p-4 text-center">{t('city.none')}</p>}
              {allowCustom && !q.trim() && <p className="text-[11px] text-[#6B7280] p-3">{t('city.custom_hint')}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
