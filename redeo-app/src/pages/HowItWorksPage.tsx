import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Calendar, CreditCard, Car, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function HowItWorksPage() {
  const { t, dir } = useI18n();

  const STEPS = [
    { num: '01', icon: Search, titleKey: 'how.step1', descKey: 'how.step1_desc' },
    { num: '02', icon: Calendar, titleKey: 'how.step2', descKey: 'how.step2_desc' },
    { num: '03', icon: CreditCard, titleKey: 'how.step3', descKey: 'how.step3_desc' },
    { num: '04', icon: Car, titleKey: 'how.step4', descKey: 'how.step4_desc' },
    { num: '05', icon: Star, titleKey: 'how.step5', descKey: 'how.step5_desc' },
  ];

  const DRIVER_STEPS = [
    t('how.driver_step1'),
    t('how.driver_step2'),
    t('how.driver_step3'),
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('how.title')}</h1>
        </div>

        <p className="text-[#A0A0A0] mb-8">{t('how.subtitle')}</p>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1B1F27] rounded-xl p-5 border border-white/5 flex gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                <step.icon className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[#FF6B00]/60">{step.num}</span>
                  <h3 className="text-sm font-medium text-white">{t(step.titleKey)}</h3>
                </div>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{t(step.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* For Drivers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">{t('how.for_drivers')}</h2>
          <p className="text-sm text-[#A0A0A0] mb-4">{t('how.for_drivers_desc')}</p>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#A0A0A0]">
            {DRIVER_STEPS.map((step, i) => (
              <div key={i} className="bg-[#1B1F27] rounded-lg p-3 border border-white/5">{step}</div>
            ))}
          </div>
          <Link to="/register" className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline">{t('how.register_driver')}</Link>
        </motion.div>
      </div>
    </div>
  );
}
