import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Check, Users, FileCheck, AlertTriangle, MessageCircle, Phone } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function SafetyPage() {
  const { t, dir } = useI18n();

  const SAFETY_FEATURES = [
    { icon: FileCheck, titleKey: 'safety.verified_drivers', descKey: 'safety.verified_drivers_desc' },
    { icon: Users, titleKey: 'safety.transparency', descKey: 'safety.transparency_desc' },
    { icon: Shield, titleKey: 'safety.secure_payments', descKey: 'safety.secure_payments_desc' },
    { icon: MessageCircle, titleKey: 'safety.inapp_chat', descKey: 'safety.inapp_chat_desc' },
    { icon: Phone, titleKey: 'safety.emergency', descKey: 'safety.emergency_desc' },
    { icon: AlertTriangle, titleKey: 'safety.report', descKey: 'safety.report_desc' },
  ];

  const TIP_KEYS = ['safety.tip1', 'safety.tip2', 'safety.tip3', 'safety.tip4', 'safety.tip5'];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('safety.title')}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Shield className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-white mb-2">{t('safety.priority')}</h2>
          <p className="text-sm text-[#A0A0A0] max-w-md mx-auto">{t('safety.desc')}</p>
        </motion.div>

        <div className="space-y-3 mb-8">
          {SAFETY_FEATURES.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#1B1F27] rounded-xl p-5 border border-white/5"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">{t(f.titleKey)}</h3>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">{t(f.descKey)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">{t('safety.tips')}</h2>
          <ul className="space-y-2">
            {TIP_KEYS.map((key, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#A0A0A0]">
                <Check className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="text-center">
          <p className="text-sm text-[#A0A0A0] mb-3">{t('safety.report_incident')}</p>
          <Link to="/support" className="inline-block bg-[#FF6B00] hover:bg-[#E56000] text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
            {t('safety.contact_support')}
          </Link>
        </div>
      </div>
    </div>
  );
}
