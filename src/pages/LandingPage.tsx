import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { MOROCCAN_CITIES } from '@/lib/data';
import {
  ArrowRight, Shield, MessageCircle, CreditCard, MapPin,
  Leaf, Headphones, Star, Car
} from 'lucide-react';

const FEATURES = [
  { icon: Shield, title: 'Verified Drivers', desc: 'Every driver is identity-verified with CIN, license, and vehicle documents checked by our team.' },
  { icon: MessageCircle, title: 'Instant Messaging', desc: 'Chat with your driver or passengers before the trip to coordinate pickup details.' },
  { icon: CreditCard, title: 'Secure Payments', desc: 'Pay securely online or with cash. Your money is protected until the trip is completed.' },
  { icon: MapPin, title: 'Live Tracking', desc: 'Share your live location with family and track your ride in real-time.' },
  { icon: Leaf, title: 'Eco-Friendly', desc: 'Share rides and reduce your carbon footprint. Join 1M+ eco-conscious travelers.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Our dedicated support team is always here to help, anytime you need.' },
];

const POPULAR_ROUTES = [
  { from: 'Casablanca', to: 'Marrakech', price: 120, image: '/images/route-casa-marrakech.jpg' },
  { from: 'Tanger', to: 'Rabat', price: 95, image: '/images/route-tangier-rabat.jpg' },
  { from: 'Fes', to: 'Casablanca', price: 110, image: '/images/route-fes-casa.jpg' },
];

const STATS = [
  { label: 'Active Users', value: '1M+' },
  { label: 'Trips Completed', value: '500K+' },
  { label: 'Cities Connected', value: '13' },
  { label: 'CO2 Saved', value: '2.5K tons' },
];

const TESTIMONIALS = [
  { name: 'Layla M.', avatar: '/images/avatar-passenger-1.jpg', text: 'Excellent driver! Very punctual and the car was super clean. Will definitely book again.', rating: 5 },
  { name: 'Karim T.', avatar: '/images/avatar-passenger-2.jpg', text: 'Great ride, smooth driving. WansniAuto makes traveling between cities so easy!', rating: 5 },
  { name: 'Youssef A.', avatar: '/images/avatar-driver-1.jpg', text: 'As a driver, I earn extra money on my daily commute. The platform is fantastic!', rating: 5 },
];

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay }}>
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { setSearchFilters } = useStore();
  const { lang, setLang, t, dir } = useI18n();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
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
      <section className="relative min-h-screen flex items-center overflow-hidden">
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
                  <span className="text-sm text-[#FF6B00] font-medium">Morocco's #1 Ride-Sharing</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6" dir={dir}>
                  {t('landing.hero_title')}
                </h1>
                <p className="text-lg text-[#A0A0A0] mb-8 max-w-lg" dir={dir}>
                  {t('landing.hero_subtitle')}
                </p>
              </motion.div>

              {/* Search Box */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-[#1B1F27]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_from')}</label>
                    <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                      <option value="">{t('common.select_city')}</option>
                      {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#A0A0A0] font-medium ml-1">{t('landing.search_to')}</label>
                    <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 rounded-xl h-12 px-4 text-white text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
                      <option value="">{t('common.select_city')}</option>
                      {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}
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
            </div>

            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hidden lg:block">
              <img src="/images/car-2.jpg" alt="Car" className="rounded-3xl shadow-2xl shadow-[#FF6B00]/10 border border-white/5" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <FadeUp key={s.label} delay={i * 0.1}>
                <div className="bg-[#1B1F27] border border-white/5 rounded-2xl p-6 text-center card-hover">
                  <p className="text-3xl font-bold text-[#FF6B00]">{s.value}</p>
                  <p className="text-sm text-[#A0A0A0] mt-1">{s.label}</p>
                </div>
              </FadeUp>
            ))}
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Why WansniAuto?</h2>
              <p className="text-[#A0A0A0] max-w-xl mx-auto" dir={dir}>{t('landing.feature_share')}</p>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 card-hover h-full">
                  <div className="w-11 h-11 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[#A0A0A0] leading-relaxed">{f.desc}</p>
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
                <div onClick={() => { setSearchFilters({ from: route.from, to: route.to, date: '', passengers: 1 }); navigate('/search'); }} className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden card-hover cursor-pointer group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={route.image} alt={`${route.from} to ${route.to}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">{route.from}</span>
                      <ArrowRight className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-white font-medium">{route.to}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#FF6B00]">{route.price} <span className="text-sm font-normal text-[#A0A0A0]">MAD / seat</span></p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#1B1F27]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('landing.popular_title')}</h2>
              <p className="text-[#A0A0A0]">{t('landing.cta_subtitle')}</p>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className={`w-4 h-4 ${j < t.rating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-white/10'}`} />)}
                  </div>
                  <p className="text-[#A0A0A0] text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF6B00]/20" />
                    <span className="text-sm font-medium text-white">{t.name}</span>
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
                  <Button onClick={() => navigate('/register')} className="bg-white text-[#FF6B00] hover:bg-white/90 rounded-xl px-8 py-6 text-base font-semibold shadow-lg">{t('landing.cta_btn')}</Button>
                  <Button onClick={() => navigate('/search')} variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 py-6 text-base font-semibold">{t('landing.search_btn')}</Button>
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
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">Wansni<span className="text-[#FF6B00]">Auto</span></span>
              </Link>
              <p className="text-sm text-[#A0A0A0]">&ldquo;سافر بسهولة وشارك الطريق&rdquo;</p>
            </div>
            {['Company', 'Support', 'Legal'].map(section => (
              <div key={section}>
                <h4 className="text-sm font-semibold text-white mb-3">{section}</h4>
                <div className="space-y-2">
                  {['About', 'Careers', 'Press'].map(item => (
                    <p key={item} className="text-sm text-[#A0A0A0] hover:text-[#FF6B00] cursor-pointer transition-colors">{item}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#A0A0A0]">&copy; 2025 WansniAuto. All rights reserved.</p>
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
