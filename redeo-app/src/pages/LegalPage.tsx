import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Cookie, Car } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function LegalPage() {
  const { t, dir } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const pathTab = pathname.startsWith('/privacy') ? 'privacy' : pathname.startsWith('/cookies') ? 'cookies' : pathname.startsWith('/driver-agreement') ? 'driver' : 'terms';
  const activeTab = searchParams.get('tab') || pathTab;

  const TABS = [
    { id: 'terms', labelKey: 'legal.terms_tab', icon: FileText },
    { id: 'privacy', labelKey: 'legal.privacy_tab', icon: Shield },
    { id: 'cookies', labelKey: 'legal.cookies_tab', icon: Cookie },
    { id: 'driver', labelKey: 'legal.driver_tab', icon: Car },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <p>{t('legal.terms_intro')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_defs')}</h3>
            <p>{t('legal.terms_defs_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_elig')}</h3>
            <p>{t('legal.terms_elig_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_resp')}</h3>
            <p>{t('legal.terms_resp_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_pay')}</h3>
            <p>{t('legal.terms_pay_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_cancel')}</h3>
            <p>{t('legal.terms_cancel_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_liability')}</h3>
            <p>{t('legal.terms_liability_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_term')}</h3>
            <p>{t('legal.terms_term_text')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.terms_changes')}</h3>
            <p>{t('legal.terms_changes_text')}</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <p>{t('legal.privacy_intro')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.privacy_1_h')}</h3>
            <p>{t('legal.privacy_1_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.privacy_2_h')}</h3>
            <p>{t('legal.privacy_2_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.privacy_3_h')}</h3>
            <p>{t('legal.privacy_3_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.privacy_4_h')}</h3>
            <p>{t('legal.privacy_4_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.privacy_5_h')}</h3>
            <p>{t('legal.privacy_5_b')}</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      case 'cookies':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium mt-4">{t('legal.cookies_1_h')}</h3>
            <p>{t('legal.cookies_1_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.cookies_2_h')}</h3>
            <p>{t('legal.cookies_2_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.cookies_3_h')}</h3>
            <p>{t('legal.cookies_3_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.cookies_4_h')}</h3>
            <p>{t('legal.cookies_4_b')}</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      case 'driver':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium mt-4">{t('legal.driver_1_h')}</h3>
            <p>{t('legal.driver_1_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.driver_2_h')}</h3>
            <p>{t('legal.driver_2_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.driver_3_h')}</h3>
            <p>{t('legal.driver_3_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.driver_4_h')}</h3>
            <p>{t('legal.driver_4_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.driver_5_h')}</h3>
            <p>{t('legal.driver_5_b')}</p>
            <h3 className="text-white font-medium mt-4">{t('legal.driver_6_h')}</h3>
            <p>{t('legal.driver_6_b')}</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12" dir={dir}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('footer.legal')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20'
                    : 'bg-[#1B1F27] text-[#A0A0A0] border border-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            {activeTab === 'terms' && t('legal.terms_title')}
            {activeTab === 'privacy' && t('legal.privacy_title')}
            {activeTab === 'cookies' && t('legal.cookies_title')}
            {activeTab === 'driver' && t('legal.driver_title')}
          </h2>
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}
