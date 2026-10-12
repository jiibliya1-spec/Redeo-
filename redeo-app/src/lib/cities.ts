import { useStore } from '@/store/useStore';
import type { Lang } from '@/lib/i18n';

/** Cities are stored in the database with their Latin key; only the display changes per language. */
const NAMES: Record<string, { fr?: string; en?: string; ar: string }> = {
  'Casablanca': { ar: 'الدار البيضاء' }, 'Rabat': { ar: 'الرباط' }, 'Marrakech': { ar: 'مراكش' },
  'Tanger': { ar: 'طنجة', en: 'Tangier' }, 'Tangier': { ar: 'طنجة' }, 'Agadir': { ar: 'أكادير' },
  'Fes': { ar: 'فاس', fr: 'Fès', en: 'Fez' }, 'Fès': { ar: 'فاس' }, 'Oujda': { ar: 'وجدة' }, 'Nador': { ar: 'الناظور' },
  'Meknes': { ar: 'مكناس', fr: 'Meknès' }, 'Tetouan': { ar: 'تطوان', fr: 'Tétouan' }, 'El Jadida': { ar: 'الجديدة' },
  'Safi': { ar: 'آسفي' }, 'Kenitra': { ar: 'القنيطرة', fr: 'Kénitra' }, 'Settat': { ar: 'سطات' }, 'Berrechid': { ar: 'برشيد' },
  'Asilah': { ar: 'أصيلة' }, 'Larache': { ar: 'العرائش' }, 'Mohammedia': { ar: 'المحمدية' }, 'Essaouira': { ar: 'الصويرة' },
  'Laayoune': { ar: 'العيون' }, 'Dakhla': { ar: 'الداخلة' }, 'Ouarzazate': { ar: 'ورزازات' }, 'Beni Mellal': { ar: 'بني ملال' },
  'Khouribga': { ar: 'خريبكة' }, 'Taza': { ar: 'تازة' }, 'Al Hoceima': { ar: 'الحسيمة' }, 'Chefchaouen': { ar: 'شفشاون' },
};

export function cityLabel(name: string | null | undefined, lang: Lang): string {
  if (!name) return '';
  const n = NAMES[name.trim()];
  if (!n) return name;
  return (lang === 'ar' ? n.ar : lang === 'fr' ? n.fr : n.en) ?? name;
}

export function useCity() {
  const lang = useStore((s) => s.language);
  return (name: string | null | undefined) => cityLabel(name, lang);
}
