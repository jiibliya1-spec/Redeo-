import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PlusCircle, Search } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { CityPicker } from '@/components/CityPicker';
import { Button } from '@/components/ui/button';
import { POPULAR_ROUTES, RouteScene } from '@/pages/LandingPage';

const field = 'w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50';

/** Home for signed-in users: straight to the app (search / publish + popular routes), no marketing page. */
export function AppHome() {
  const { t, dir } = useI18n();
  const city = useCity();
  const navigate = useNavigate();
  const { user, mode, setSearchFilters } = useStore();
  const isDriver = mode === 'driver';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';

  const search = () => { setSearchFilters({ from, to, date, passengers }); navigate('/search'); };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8" dir={dir}>
        <div className="pt-4">
          {firstName && <p className="text-sm text-[#A0A0A0]">{t('home.hello', { name: firstName })}</p>}
          <h1 className="text-2xl font-bold text-white mt-1">{isDriver ? t('driver.offer_ride') : t('home.where_to')}</h1>
          {isDriver && <p className="text-sm text-[#A0A0A0] mt-1">{t('home.driver_sub')}</p>}
        </div>

        {isDriver ? (
          <div className="bg-[#1B1F27] border border-white/10 rounded-2xl p-5 space-y-3">
            <Button onClick={() => navigate('/publish-trip')} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-[#FF6B00]/20">
              <PlusCircle className="w-5 h-5 mr-2" /> {t('driver.publish')}
            </Button>
            <Button onClick={() => navigate('/driver')} variant="outline" className="w-full h-12 rounded-xl border-white/10 text-white bg-transparent hover:bg-white/5">
              <Car className="w-5 h-5 mr-2 text-[#FF6B00]" /> {t('home.my_trips')}
            </Button>
          </div>
        ) : (
          <div className="bg-[#1B1F27] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_from')}</label>
                <CityPicker value={from} onChange={setFrom} placeholder={t('common.select_city')} className={field} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_to')}</label>
                <CityPicker value={to} onChange={setTo} exclude={from} placeholder={t('common.select_city')} className={field} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_date')}</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={field} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_passengers')}</label>
                <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className={`${field} appearance-none`}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={search} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-[#FF6B00]/20">
              <Search className="w-5 h-5 mr-2" /> {t('landing.search_btn')}
            </Button>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-white mb-3">{t('landing.popular_title')}</h2>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
            {POPULAR_ROUTES.map((route, i) => (
              <button
                key={`${route.from}-${route.to}`}
                onClick={() => { setSearchFilters({ from: route.from, to: route.to, date: '', passengers: 1 }); navigate('/search'); }}
                className="snap-start shrink-0 w-[78%] sm:w-auto text-start bg-[#1B1F27] rounded-2xl border border-white/10 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="relative h-28 overflow-hidden" dir="ltr">
                  <RouteScene i={i} scene={route.scene} />
                  <div className="absolute top-2 left-2 right-2 flex justify-between text-[11px] font-medium text-white/90">
                    <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/10">{t('landing.km', { n: route.km })}</span>
                    <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/10">{t('landing.hrs', { n: route.hrs })}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-base mb-2">
                    <span className="text-white font-semibold">{city(route.from)}</span>
                    <ArrowRight className={`w-4 h-4 text-[#FF6B00] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    <span className="text-white font-semibold">{city(route.to)}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0]">{t('landing.from_price')}</p>
                  <p className="text-2xl font-bold text-[#FF6B00] leading-none mt-0.5">{route.price} <span className="text-xs font-normal text-[#A0A0A0]">{t('trip.price')} / {t('landing.per_seat')}</span></p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
