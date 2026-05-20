import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function FAQPage() {
  const { t, dir } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const FAQS = [
    { qKey: 'faq.q1', aKey: 'faq.a1' },
    { qKey: 'faq.q2', aKey: 'faq.a2' },
    { qKey: 'faq.q3', aKey: 'faq.a3' },
    { qKey: 'faq.q4', aKey: 'faq.a4' },
    { qKey: 'faq.q5', aKey: 'faq.a5' },
    { qKey: 'faq.q6', aKey: 'faq.a6' },
    { qKey: 'faq.q7', aKey: 'faq.a7' },
    { qKey: 'faq.q8', aKey: 'faq.a8' },
    { qKey: 'faq.q9', aKey: 'faq.a9' },
    { qKey: 'faq.q10', aKey: 'faq.a10' },
    { qKey: 'faq.q11', aKey: 'faq.a11' },
    { qKey: 'faq.q12', aKey: 'faq.a12' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('faq.title')}</h1>
        </div>

        <p className="text-sm text-[#A0A0A0] mb-6">
          {t('faq.subtitle')}{' '}
          <Link to="/support" className="text-[#FF6B00] hover:underline">{t('faq.contact_us')}</Link>
        </p>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm text-white font-medium pr-4">{t(faq.qKey)}</span>
                <ChevronDown className={`w-4 h-4 text-[#A0A0A0] shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-[#A0A0A0] px-4 pb-4 leading-relaxed">{t(faq.aKey)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
