import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function CareersPage() {
  const { t, dir } = useI18n();

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('careers.title')}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Briefcase className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-white mb-2">{t('careers.join')}</h2>
          <p className="text-sm text-[#A0A0A0] max-w-md mx-auto">{t('careers.desc')}</p>
        </motion.div>

        <div className="bg-[#1B1F27] rounded-xl p-6 border border-white/5 text-center">
          <p className="text-sm text-white mb-4">{t('careers.none')}</p>
          <Link to="/contact" className="inline-block px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold">{t('careers.contact')}</Link>
        </div>

      </div>
    </div>
  );
}
