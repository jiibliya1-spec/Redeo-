import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Shield, CreditCard, Leaf, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function AboutPage() {
  const { t, dir } = useI18n();

  const VALUES = [
    { icon: Shield, titleKey: 'about.safety', descKey: 'about.safety_desc' },
    { icon: CreditCard, titleKey: 'about.pricing', descKey: 'about.pricing_desc' },
    { icon: Leaf, titleKey: 'about.eco', descKey: 'about.eco_desc' },
    { icon: Heart, titleKey: 'about.community', descKey: 'about.community_desc' },
  ];

  const STATS = [
    { value: '1M+', labelKey: 'about.users' },
    { value: '500K+', labelKey: 'about.trips' },
    { value: '13', labelKey: 'about.cities' },
    { value: '4.8', labelKey: 'about.rating' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('about.title')}</h1>
        </div>

        {/* Hero Image */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden mb-8">
          <img src="/images/about-hero.jpg" alt="WansniAuto" className="w-full h-56 sm:h-72 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent" />
        </motion.div>

        {/* Story */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">{t('about.story')}</h2>
          <p className="text-[#A0A0A0] leading-relaxed mb-4">{t('about.story_p1')}</p>
          <p className="text-[#A0A0A0] leading-relaxed">{t('about.story_p2')}</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.labelKey} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-bold text-[#FF6B00]">{s.value}</p>
              <p className="text-xs text-[#A0A0A0] mt-1">{t(s.labelKey)}</p>
            </div>
          ))}
        </motion.div>

        {/* Values */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-semibold text-white mb-4">{t('about.values')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div key={v.titleKey} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                <v.icon className="w-6 h-6 text-[#FF6B00] mb-3" />
                <h3 className="text-sm font-medium text-white mb-1">{t(v.titleKey)}</h3>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{t(v.descKey)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mission */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-10 bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6 text-center">
          <Car className="w-10 h-10 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">{t('about.mission')}</h2>
          <p className="text-sm text-[#A0A0A0] max-w-lg mx-auto">{t('about.mission_desc')}</p>
        </motion.div>

        {/* Team note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#A0A0A0]/50">
            {t('about.proudly')}{' '}
            <Link to="/careers" className="text-[#FF6B00] hover:underline ml-1">{t('about.join_team')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
