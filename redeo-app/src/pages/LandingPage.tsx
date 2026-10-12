import { useState, useEffect } from 'react';
import { useCity } from '@/lib/cities';
import { Logo } from '@/components/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { MOROCCAN_CITIES } from '@/lib/data';
import { ArrowRight, Shield, MessageCircle, CreditCard, MapPin, Leaf, Headphones, PlusCircle } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';

const FEATURES = [
  { icon: Shield, titleKey: 'landing.feature_drivers', descKey: 'landing.feature_drivers_desc' },
  { icon: MessageCircle, titleKey: 'landing.feature_chat', descKey: 'landing.feature_chat_desc' },
  { icon: CreditCard, titleKey: 'landing.feature_payments', descKey: 'landing.feature_payments_desc' },
  { icon: MapPin, titleKey: 'landing.feature_tracking', descKey: 'landing.feature_tracking_desc' },
  { icon: Leaf, titleKey: 'landing.feature_eco', descKey: 'landing.feature_eco_desc' },
  { icon: Headphones, titleKey: 'landing.feature_chat', descKey: 'landing.feature_chat_desc' },
];

export const POPULAR_ROUTES = [
  { from: 'Casablanca', to: 'Marrakech', price: 75, km: 240, hrs: 3, scene: 0 },
  { from: 'Tanger', to: 'Rabat', price: 65, km: 250, hrs: 2.5, scene: 1 },
  { from: 'Fes', to: 'Casablanca', price: 90, km: 290, hrs: 3, scene: 2 },
];


const SCENES = [
  { sky: ['#2b1a3d', '#ff7a2f'], sun: '#ffd27a', far: '#5a3a5e', mid: '#3b2447', near: '#1d1226', dune: '#c9692a' },
  { sky: ['#1b2a4a', '#ffb25a'], sun: '#fff0b0', far: '#7a5a52', mid: '#a1623a', near: '#6b3a22', dune: '#e08a3c' },
  { sky: ['#1f2347', '#ff8f5a'], sun: '#ffe2a0', far: '#4c4268', mid: '#35294d', near: '#1a1428', dune: '#d27a3a' },
];

export function RouteScene({ i, scene }: { i: number; scene: number }) {
  const c = SCENES[scene % SCENES.length];
  const sx = scene === 1 ? 70 : 225;
  return (
    <svg viewBox="0 0 300 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.sky[0]} /><stop offset="1" stopColor={c.sky[1]} /></linearGradient>
        <linearGradient id={`road-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2a32" /><stop offset="1" stopColor="#15151a" /></linearGradient>
      </defs>
      <rect width="300" height="140" fill={`url(#sky-${i})`} />
      <circle cx={sx} cy="52" r="34" fill={c.sun} opacity=".18" />
      <circle cx={sx} cy="52" r="20" fill={c.sun} opacity=".95" />
      {[[30, 24], [90, 14], [150, 30], [250, 18], [200, 10]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="0.9" fill="#fff" opacity=".6" />)}
      <path d="M0 88 L28 62 L46 76 L78 44 L108 74 L134 56 L170 84 L206 50 L240 76 L270 58 L300 80 L300 140 L0 140Z" fill={c.far} />
      <path d="M78 44 L69 53 L78 51 L85 54Z M206 50 L198 58 L206 56 L213 59Z" fill="#fff" opacity=".5" />
      <path d="M0 106 L40 80 L72 98 L112 70 L150 100 L190 76 L232 102 L270 82 L300 98 L300 140 L0 140Z" fill={c.mid} />
      <path d="M0 116 Q40 98 85 112 T170 108 T300 112 L300 140 L0 140Z" fill={c.dune} opacity=".9" />
      <path d="M0 126 Q60 112 120 124 T240 120 T300 126 L300 140 L0 140Z" fill={c.near} />
      <path d="M-10 140 C 80 118, 120 132, 170 112 S 270 96, 310 86 L310 98 C 270 108, 190 124, 150 130 S 60 142, -10 150Z" fill={`url(#road-${i})`} opacity=".95" />
      <path d="M-10 145 C 80 124, 120 136, 170 118 S 270 100, 310 92" fill="none" stroke="#ffd27a" strokeWidth="1.2" strokeDasharray="6 6" opacity=".85" />
      <g fill={c.near} opacity=".95">
        <rect x="262" y="104" width="1.6" height="16" /><path d="M263 104 q-9 -2 -12 4 q8 -3 12 -1 q8 -3 12 3 q-4 -6 -12 -6Z" />
        <rect x="38" y="108" width="1.6" height="14" /><path d="M39 108 q-8 -2 -11 4 q7 -3 11 -1 q7 -3 11 3 q-4 -6 -11 -6Z" />
      </g>
    </svg>
  );
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay }}>
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const city = useCity();
  const navigate = useNavigate();
  const { setSearchFilters, user } = useStore();
  const { lang, setLang, t, dir } = useI18n();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);

  // Role detection
  const isDriver = user?.role === 'driver';
  // scrolled state

  useEffect(() => {
    const h = () => void window.scrollY;
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleSearch = () => {
    setSearchFilters({ from, to, date, passengers });
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-[#0F1115]">
      {/* Hero */}
      <section className="keep-dark relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src="/images/car-1.jpg" alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115]/80 via-[#0F1115]/70 to-[#0F1115]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F1115]/90 via-transparent to-[#0F1115]/90" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <div className="inline-flex items-center gap-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-full px-4 py-1.5 mb-6">
                  <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse" />
                  <span className="text-sm text-[#FF6B00] font-medium">{t('landing.badge')}</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6" dir={dir}>
                  {t('landing.hero_title')}
                </h1>
                <p className="text-lg text-[#A0A0A0] mb-8 max-w-lg" dir={dir}>
                  {t('landing.hero_subtitle')}
                </p>
              </motion.div>

              {/* Driver: Publish | Passenger: Search */}
              {isDriver ? (
                /* DRIVER: Publish a ride */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-[#1B1F27]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-[#FF6B00]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{t('driver.offer_ride')}</h3>
                      <p className="text-xs text-[#A0A0A0]">{t('driver.publish_subtitle')}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('driver.from')}</label>
                      <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                        <option value="">{t('common.select_city')}</option>
                        {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{city(c)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('driver.to')}</label>
                      <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                        <option value="">{t('common.select_city')}</option>
                        {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{city(c)}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button onClick={() => { setSearchFilters({ from, to, date, passengers }); navigate('/publish-trip'); }} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-[#FF6B00]/20">
                    <PlusCircle className="w-5 h-5 mr-2" /> {t('driver.publish')}
                  </Button>
                </motion.div>
              ) : (
                /* PASSENGER: Search for a ride */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-[#1B1F27]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_from')}</label>
                      <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                        <option value="">{t('common.select_city')}</option>
                        {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{city(c)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_to')}</label>
                      <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                        <option value="">{t('common.select_city')}</option>
                        {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{city(c)}</option>)}
                    </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_date')}</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_passengers')}</label>
                      <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button onClick={handleSearch} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white h-12 rounded-xl text-base font-semibold shadow-lg shadow-[#FF6B00]/20">
                    <Search className="w-5 h-5 mr-2" /> {t('landing.search_btn')}
                  </Button>
                </motion.div>
              )}
            </div>

            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hidden lg:block">
              <img src="/images/car-2.jpg" alt="" className="rounded-3xl shadow-2xl shadow-[#FF6B00]/10 border border-white/5" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="features" className="py-20 bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" dir={dir}>{t('landing.how_title')}</h2>
              <p className="text-[#A0A0A0] max-w-xl mx-auto" dir={dir}>{t('landing.how_1_desc')}</p>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: t('landing.how_1'), desc: t('landing.how_1_desc'), icon: Search },
              { step: '02', title: t('landing.how_2'), desc: t('landing.how_2_desc'), icon: CreditCard },
              { step: '03', title: t('landing.how_3'), desc: t('landing.how_3_desc'), icon: Car },
            ].map((item, i) => (
              <FadeUp key={item.step} delay={i * 0.15}>
                <div className="bg-[#1B1F27] border border-white/5 rounded-2xl p-8 text-center card-hover relative overflow-hidden">
                  <span className="absolute top-4 right-4 text-6xl font-bold text-[#FF6B00]/5">{item.step}</span>
                  <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <item.icon className="w-7 h-7 text-[#FF6B00]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-[#A0A0A0] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#1B1F27]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" dir={dir}>{t('landing.why_title')}</h2>
              <p className="text-[#A0A0A0] max-w-xl mx-auto" dir={dir}>{t('landing.why_subtitle')}</p>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.titleKey} delay={i * 0.08}>
                <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 card-hover h-full">
                  <div className="w-11 h-11 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5" dir={dir}>{t(f.titleKey)}</h3>
                  <p className="text-sm text-[#A0A0A0] leading-relaxed" dir={dir}>{t(f.descKey)}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section id="routes" className="py-20 bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2" dir={dir}>{t('landing.popular_title')}</h2>
                <p className="text-[#A0A0A0]" dir={dir}>{t('landing.popular_subtitle')}</p>
              </div>
              <Button onClick={() => navigate('/search')} variant="outline" className="hidden sm:flex border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">{t('landing.search_btn')}</Button>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-6">
            {POPULAR_ROUTES.map((route, i) => (
              <FadeUp key={`${route.from}-${route.to}`} delay={i * 0.15}>
                <div role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }} onClick={() => { setSearchFilters({ from: route.from, to: route.to, date: '', passengers: 1 }); navigate('/search'); }} className="group relative bg-[#1B1F27] rounded-3xl border border-white/10 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6B00]/40 hover:shadow-2xl hover:shadow-[#FF6B00]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6B00]">
                  <div className="relative h-48 overflow-hidden" dir="ltr">
                    <RouteScene i={i} scene={route.scene} />
                    <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                      <path id={`rt-${i}`} d="M40 95 C 100 40, 200 100, 260 45" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" />
                      <path d="M40 95 C 100 40, 200 100, 260 45" fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 8" />
                      <circle cx="40" cy="95" r="7" fill="#0F1115" stroke="#fff" strokeWidth="3" />
                      <circle cx="260" cy="45" r="7" fill="#FF6B00" stroke="#fff" strokeWidth="3" />
                      <circle r="5" fill="#fff"><animateMotion dur="3.5s" repeatCount="indefinite" rotate="auto"><mpath href={`#rt-${i}`} /></animateMotion></circle>
                    </svg>
                    <div className="absolute top-3 left-3 right-3 flex justify-between text-xs font-medium text-white/90">
                      <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10">{t('landing.km', { n: route.km })}</span>
                      <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10">{t('landing.hrs', { n: route.hrs })}</span>
                    </div>
                  </div>
                  <div className="p-5" dir={dir}>
                    <div className="flex items-center gap-2 mb-4 text-lg">
                      <span className="text-white font-semibold">{city(route.from)}</span>
                      <ArrowRight className={`w-4 h-4 text-[#FF6B00] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                      <span className="text-white font-semibold">{city(route.to)}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-[#A0A0A0]">{t('landing.from_price')}</p>
                        <p className="text-3xl font-bold text-[#FF6B00] leading-none">{route.price} <span className="text-sm font-normal text-[#A0A0A0]">{t('trip.price')} / {t('landing.per_seat')}</span></p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold shadow-lg shadow-[#FF6B00]/25 transition-colors group-hover:bg-[#E56000]">
                        {t('landing.route_cta')} <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FF8533] p-10 md:p-16 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" dir={dir}>{t('landing.cta_title')}</h2>
                <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto" dir={dir}>{t('landing.cta_subtitle')}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button onClick={() => navigate('/register')} className="bg-white text-[#FF6B00] hover:bg-white/90 hover:-translate-y-0.5 transition-all rounded-2xl px-10 h-14 text-base font-bold shadow-xl shadow-black/20">{t('landing.cta_btn')}</Button>
                  <Button onClick={() => navigate('/search')} variant="outline" className="border-white/40 bg-white/5 backdrop-blur text-white hover:bg-white/15 hover:text-white rounded-2xl px-10 h-14 text-base font-semibold">{t('landing.search_btn')}</Button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F1115] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <Logo className="w-8 h-8" />
                <span className="text-lg font-semibold text-white">Re<span className="text-[#FF6B00]">deo</span></span>
              </Link>
              <p className="text-sm text-[#A0A0A0]">&ldquo;{t('footer.slogan')}&rdquo;</p>
              <p className="text-xs text-[#A0A0A0]/60 mt-2">{t('footer.tagline_desc')}</p>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">{t('footer.company')}</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.about')}</Link>
                <Link to="/how-it-works" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.how_it_works')}</Link>
                <Link to="/careers" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.careers')}</Link>
                <a href="https://instagram.com/wansniauto" target="_blank" rel="noopener noreferrer" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">Instagram</a>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">{t('footer.support')}</h4>
              <div className="space-y-2">
                <Link to="/support" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.help')}</Link>
                <Link to="/contact" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.contact')}</Link>
                <Link to="/safety" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.safety')}</Link>
                <Link to="/faq" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.faq')}</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">{t('footer.legal')}</h4>
              <div className="space-y-2">
                <Link to="/terms" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.terms')}</Link>
                <Link to="/privacy" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.privacy')}</Link>
                <Link to="/cookies" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.cookies')}</Link>
                <Link to="/driver-agreement" className="block text-sm text-[#A0A0A0] hover:text-[#FF6B00] transition-colors">{t('footer.driver_agreement')}</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#A0A0A0]">{t('ui.2025_wansniauto_all_6607')}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setLang('en')} className={`text-sm transition-colors ${lang === 'en' ? 'text-[#FF6B00] font-bold' : 'text-[#A0A0A0] hover:text-[#FF6B00]'}`}>EN</button>
              <button onClick={() => setLang('fr')} className={`text-sm transition-colors ${lang === 'fr' ? 'text-[#FF6B00] font-bold' : 'text-[#A0A0A0] hover:text-[#FF6B00]'}`}>FR</button>
              <button onClick={() => setLang('ar')} className={`text-sm transition-colors ${lang === 'ar' ? 'text-[#FF6B00] font-bold' : 'text-[#A0A0A0] hover:text-[#FF6B00]'}`}>AR</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
