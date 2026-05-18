import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Cookie, Car } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function LegalPage() {
  const { t, dir } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'terms';

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
            <h3 className="text-white font-medium mt-4">1. Données Collectées</h3>
            <p>Nous collectons: données d'identité, données de vérification (conducteurs), données de trajet, données de paiement (traitées par nos partenaires), données techniques, et communications.</p>
            <h3 className="text-white font-medium mt-4">2. Utilisation des Données</h3>
            <p>Fournir nos services, vérifier les identités, traiter les paiements, envoyer des confirmations, assurer la sécurité, respecter les obligations légales.</p>
            <h3 className="text-white font-medium mt-4">3. Partage des Données</h3>
            <p>Données limitées entre utilisateurs pour la coordination des trajets. Partage avec: processeurs de paiement, services de vérification, autorités (lorsque requis par la loi). Nous ne vendons jamais vos données.</p>
            <h3 className="text-white font-medium mt-4">4. Sécurité</h3>
            <p>Chiffrement TLS 1.3, serveurs sécurisés, audits réguliers. Accès restreint au personnel autorisé uniquement.</p>
            <h3 className="text-white font-medium mt-4">5. Vos Droits</h3>
            <p>Droit d'accès, de rectification, de suppression (avec limitations), d'opposition et de retrait du consentement.</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      case 'cookies':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium mt-4">1. Cookies Essentiels</h3>
            <p>Nécessaires au fonctionnement de la plateforme: sessions de connexion, sécurité, processus de réservation. Ne peuvent pas être désactivés.</p>
            <h3 className="text-white font-medium mt-4">2. Cookies Analytiques</h3>
            <p>Nous aident à comprendre comment les utilisateurs interagissent avec notre plateforme (Google Analytics). Données anonymisées.</p>
            <h3 className="text-white font-medium mt-4">3. Cookies de Préférences</h3>
            <p>Mémorisent vos paramètres: préférence linguistique, options d'affichage, informations de passagers sauvegardées.</p>
            <h3 className="text-white font-medium mt-4">4. Gestion des Cookies</h3>
            <p>Vous pouvez contrôler les cookies via les paramètres de votre navigateur. La désactivation des cookies essentiels peut empêcher la plateforme de fonctionner correctement.</p>
            <p className="text-xs text-[#A0A0A0]/50 mt-6">{t('legal.last_updated')}</p>
          </div>
        );
      case 'driver':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium mt-4">1. Statut d'Indépendant</h3>
            <p>Vous êtes un entrepreneur indépendant, pas un employé de WansniAuto. Vous contrôlez votre emploi du temps, itinéraires et tarification.</p>
            <h3 className="text-white font-medium mt-4">2. Exigences du Véhicule</h3>
            <p>Véhicule immatriculé au Maroc, assurance valide couvrant le transport de passagers, âge du véhicule ≤ 15 ans, état propre et sûr.</p>
            <h3 className="text-white font-medium mt-4">3. Conduite du Conducteur</h3>
            <p>Arriver à l'heure, communiquer clairement, conduire en sécurité, respecter les lois, ne pas discriminer, ne pas utiliser la plateforme pour du taxi commercial.</p>
            <h3 className="text-white font-medium mt-4">4. Tarification et Paiements</h3>
            <p>Vous fixez vos prix. WansniAuto déduit 5% de frais de service. Paiements transférés sous 3-5 jours ouvrables après le trajet. Vous êtes responsable de vos déclarations fiscales.</p>
            <h3 className="text-white font-medium mt-4">5. Politique d'Annulation</h3>
            <p>Évitez les annulations. Annulations d'urgence uniquement — annulations fréquentes = pénalités. Annulation &lt; 2h avant le départ = pénalités.</p>
            <h3 className="text-white font-medium mt-4">6. Sécurité des Passagers</h3>
            <p>Conduite sûre, ceintures fonctionnelles, respect du code de la route, comportement approprié. Tout accident doit être signalé sous 24h.</p>
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
          <h1 className="text-2xl font-bold text-white">Legal</h1>
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
