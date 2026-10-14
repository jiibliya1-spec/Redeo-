import { useStore } from '@/store/useStore';
import type { Lang } from '@/lib/i18n';

/** [database key (Latin), Arabic, lat, lng, French spelling when it differs, English spelling when it differs].
 *  Trips store the Latin key; only the display changes per language. */
type Row = [string, string, number, number, string?, string?];
const ROWS: Row[] = [
  // major cities first (keeps the usual order in the pickers)
  ['Casablanca', 'الدار البيضاء', 33.5731, -7.5898], ['Rabat', 'الرباط', 34.0209, -6.8416],
  ['Marrakech', 'مراكش', 31.6295, -7.9811], ['Tanger', 'طنجة', 35.7595, -5.834, undefined, 'Tangier'],
  ['Agadir', 'أكادير', 30.4278, -9.5981], ['Fes', 'فاس', 34.0181, -5.0078, 'Fès', 'Fez'],
  ['Oujda', 'وجدة', 34.6867, -1.9114], ['Nador', 'الناظور', 35.1681, -2.9335],
  ['Meknes', 'مكناس', 33.8935, -5.5473, 'Meknès'], ['Tetouan', 'تطوان', 35.5785, -5.3684, 'Tétouan'],
  ['El Jadida', 'الجديدة', 33.2316, -8.5007], ['Safi', 'آسفي', 32.2994, -9.2372],
  ['Kenitra', 'القنيطرة', 34.261, -6.5802, 'Kénitra'],
  // north
  ['Asilah', 'أصيلة', 35.465, -6.034], ['Larache', 'العرائش', 35.1932, -6.1557], ['Ksar el-Kebir', 'القصر الكبير', 35.0017, -5.9042],
  ['Chefchaouen', 'شفشاون', 35.1688, -5.2636], ['Ouezzane', 'وزان', 34.7979, -5.5846], ['Al Hoceima', 'الحسيمة', 35.2517, -3.9372],
  ['Fnideq', 'الفنيدق', 35.8496, -5.3567], ['Mdiq', 'المضيق', 35.6855, -5.3256], ['Martil', 'مرتيل', 35.6167, -5.2753],
  ['Targuist', 'تارجيست', 34.9333, -4.3167], ['Imzouren', 'إمزورن', 35.1456, -3.8511], ['Bni Bouayach', 'بني بوعياش', 35.1167, -3.9833],
  ['Taounate', 'تاونات', 34.5361, -4.6403], ['Ain Aicha', 'عين عائشة', 34.5833, -4.5333],
  // oriental
  ['Berkane', 'بركان', 34.9206, -2.3203], ['Saidia', 'السعيدية', 35.0872, -2.2336], ['Taourirt', 'تاوريرت', 34.4073, -2.8981],
  ['Guercif', 'جرسيف', 34.2275, -3.3547], ['Jerada', 'جرادة', 34.3117, -2.1611], ['Figuig', 'فجيج', 32.1094, -1.2292],
  ['Driouch', 'الدريوش', 34.9783, -3.3922], ['Zaio', 'زايو', 34.9514, -2.7333], ['Ahfir', 'أحفير', 34.9833, -2.1],
  ['Beni Ansar', 'بني أنصار', 35.2569, -2.9283], ['Selouane', 'سلوان', 35.0914, -2.9467], ['El Aioun Sidi Mellouk', 'العيون الشرقية', 34.0667, -2.5],
  // Fes - Meknes - centre
  ['Taza', 'تازة', 34.21, -4.01], ['Sefrou', 'صفرو', 33.8306, -4.8353], ['Ifrane', 'إفران', 33.5228, -5.1106],
  ['Azrou', 'أزرو', 33.4342, -5.2217], ['Khenifra', 'خنيفرة', 32.9394, -5.6686], ['Midelt', 'ميدلت', 32.6852, -4.7345],
  ['Moulay Yacoub', 'مولاي يعقوب', 34.0833, -5.1833], ['El Hajeb', 'الحاجب', 33.6867, -5.3689], ['Boulemane', 'بولمان', 33.3628, -4.7306],
  ['Imouzzer Kandar', 'إيموزار كندر', 33.7333, -5.0], ['Ain Taoujdate', 'عين تاوجطات', 33.9333, -5.2],
  // Rabat - Sale - Kenitra
  ['Sale', 'سلا', 34.0331, -6.7986, 'Salé'], ['Temara', 'تمارة', 33.9287, -6.9066, 'Témara'], ['Skhirat', 'الصخيرات', 33.8508, -7.0322],
  ['Khemisset', 'الخميسات', 33.8242, -6.0661, 'Khémisset'], ['Sidi Kacem', 'سيدي قاسم', 34.2214, -5.7079], ['Sidi Slimane', 'سيدي سليمان', 34.2653, -5.9261],
  ['Sidi Yahya El Gharb', 'سيدي يحيى الغرب', 34.3, -6.3], ['Mechra Bel Ksiri', 'مشرع بلقصيري', 34.5833, -5.95],
  ['Tifelt', 'تيفلت', 33.8944, -6.5539], ['Rommani', 'الرماني', 33.5167, -6.6], ['Souk El Arbaa', 'سوق أربعاء الغرب', 34.6833, -5.9667],
  // Casablanca - Settat
  ['Mohammedia', 'المحمدية', 33.6866, -7.383], ['Settat', 'سطات', 33.001, -7.6166], ['Berrechid', 'برشيد', 33.2655, -7.5875],
  ['Bouznika', 'بوزنيقة', 33.7894, -7.1594], ['Benslimane', 'بنسليمان', 33.6178, -7.1208], ['Nouaceur', 'النواصر', 33.3667, -7.5833],
  ['Dar Bouazza', 'دار بوعزة', 33.5167, -7.8], ['Ain Harrouda', 'عين حرودة', 33.6372, -7.4492], ['Had Soualem', 'حد السوالم', 33.3, -7.4],
  ['El Gara', 'الكارة', 33.2833, -7.4333], ['Ben Ahmed', 'ابن أحمد', 33.0667, -7.2667], ['Sidi Rahal', 'سيدي الرحال', 33.4667, -8.0],
  // Beni Mellal - Khenifra - Khouribga
  ['Khouribga', 'خريبكة', 32.8811, -6.9063], ['Beni Mellal', 'بني ملال', 32.3373, -6.3498], ['Fquih Ben Salah', 'الفقيه بن صالح', 32.5, -6.6833],
  ['Kasba Tadla', 'قصبة تادلة', 32.5978, -6.2653], ['Azilal', 'أزيلال', 31.9667, -6.5667], ['Oued Zem', 'وادي زم', 32.8631, -6.5731],
  ['Boujaad', 'بوجاد', 32.7667, -6.4], ['Demnate', 'دمنات', 31.7333, -7.0], ['Ouaouizeght', 'أوولاوزغت', 32.15, -6.3],
  // Marrakech - Safi - Essaouira
  ['Essaouira', 'الصويرة', 31.5085, -9.7595], ['Youssoufia', 'اليوسفية', 32.2461, -8.5303], ['Ben Guerir', 'بن جرير', 32.2361, -7.9533],
  ['Chichaoua', 'شيشاوة', 31.5333, -8.7667], ['El Kelaa des Sraghna', 'قلعة السراغنة', 32.0533, -7.4], ['Amizmiz', 'أمزميز', 31.2167, -8.2333],
  ['Asni', 'أسني', 31.2447, -7.9889], ['Imlil', 'إمليل', 31.1361, -7.9189], ['Ourika', 'أوريكا', 31.3, -7.7833], ['Tahannaout', 'تاحناوت', 31.35, -7.95],
  ['Sidi Kaouki', 'سيدي كاوكي', 31.3667, -9.7833], ['Oualidia', 'الوليدية', 32.7333, -9.0333], ['Sidi Bennour', 'سيدي بنور', 32.65, -8.4247],
  ['Azemmour', 'أزمور', 33.2897, -8.3417], ['Jorf Lasfar', 'الجرف الأصفر', 33.1, -8.6333], ['Moulay Abdallah', 'مولاي عبد الله', 33.2, -8.6],
  // Souss - Massa
  ['Taroudant', 'تارودانت', 30.4727, -8.8749], ['Inezgane', 'إنزكان', 30.3558, -9.5336], ['Ait Melloul', 'أيت ملول', 30.3344, -9.4972],
  ['Tiznit', 'تيزنيت', 29.6974, -9.7316], ['Taghazout', 'تغازوت', 30.5439, -9.7106], ['Tamraght', 'تمراغت', 30.5, -9.7], ['Imsouane', 'إمسوان', 30.8453, -9.8236],
  ['Biougra', 'بيوكرى', 30.2167, -9.3667], ['Ait Baha', 'أيت باها', 30.0833, -9.1667], ['Tafraoute', 'تافراوت', 29.7186, -8.9747], ['Oulad Teima', 'أولاد تايمة', 30.3967, -9.2144],
  ['Sidi Ifni', 'سيدي إفني', 29.3797, -10.1731], ['Aourir', 'أورير', 30.5, -9.6],
  // Draa - Tafilalet
  ['Ouarzazate', 'ورزازات', 30.9189, -6.8934], ['Zagora', 'زاكورة', 30.3306, -5.8381], ['Errachidia', 'الرشيدية', 31.9314, -4.4244],
  ['Tinghir', 'تنغير', 31.5147, -5.5328], ['Rissani', 'الريصاني', 31.2833, -4.2667], ['Merzouga', 'مرزوكة', 31.0994, -4.0122], ['Erfoud', 'أرفود', 31.4333, -4.2333],
  ['Boumalne Dades', 'بومالن دادس', 31.3736, -5.9847], ['Kelaat Mgouna', 'قلعة مكونة', 31.2397, -6.1308], ['Skoura', 'سكورة', 31.0586, -6.5558],
  ['Agdz', 'أكدز', 30.7, -6.45], ['Tata', 'طاطا', 29.7436, -7.9722], ['Akka', 'أقا', 29.3919, -8.2594], ['Alnif', 'ألنيف', 31.1, -5.1667], ['Goulmima', 'كلميمة', 31.7, -4.95],
  // Sahara
  ['Guelmim', 'كلميم', 28.987, -10.0574], ['Tan-Tan', 'طانطان', 28.4378, -11.1031], ['Assa', 'أسا', 28.6117, -9.4283],
  ['Laayoune', 'العيون', 27.1253, -13.1625], ['Smara', 'السمارة', 26.7384, -11.6719], ['Boujdour', 'بوجدور', 26.1253, -14.4847],
  ['Tarfaya', 'طرفاية', 27.9386, -12.9283], ['Dakhla', 'الداخلة', 23.6848, -15.9579], ['Bir Gandouz', 'بئر كندوز', 21.5667, -16.3],
];

const NAMES: Record<string, { fr?: string; en?: string; ar: string }> = {};
export const CITY_COORDS: Record<string, [number, number]> = {};
for (const [key, ar, lat, lng, fr, en] of ROWS) {
  NAMES[key] = { ar, fr, en };
  CITY_COORDS[key] = [lat, lng];
}
// legacy / alternative spellings stored by earlier trips
NAMES['Tangier'] = { ar: 'طنجة' }; CITY_COORDS['Tangier'] = CITY_COORDS['Tanger'];
NAMES['Fès'] = { ar: 'فاس' }; CITY_COORDS['Fès'] = CITY_COORDS['Fes'];

/** Keys offered in the pickers. */
export const MOROCCAN_CITY_KEYS: string[] = Array.from(new Set(ROWS.map((r) => r[0])));
/** The first rows are the big cities, shown first in the pickers. */
export const MAJOR_CITY_COUNT = 13;

export function cityLabel(name: string | null | undefined, lang: Lang): string {
  if (!name) return '';
  const n = NAMES[name.trim()];
  if (!n) return name;
  return (lang === 'ar' ? n.ar : lang === 'fr' ? n.fr : n.en) ?? name;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');

const LOOKUP = new Map<string, string>();
for (const [k, v] of Object.entries(NAMES)) {
  const key = k === 'Tangier' ? 'Tanger' : k === 'Fès' ? 'Fes' : k;
  for (const label of [k, v.ar, v.fr, v.en]) if (label) LOOKUP.set(norm(label), key);
}

/** Turns what a driver typed into the known key when it matches a listed city, otherwise a cleaned custom name. */
export function canonicalCity(input: string): string {
  const clean = input.replace(/\s+/g, ' ').trim().slice(0, 40);
  return LOOKUP.get(norm(clean)) || clean;
}

/** True when the picker query matches a city label in any language. */
export function cityMatches(key: string, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  const n = NAMES[key];
  return [key, n?.ar, n?.fr, n?.en].some((l) => l && norm(l).includes(q));
}

export function useCity() {
  const lang = useStore((s) => s.language);
  return (name: string | null | undefined) => cityLabel(name, lang);
}
