import { useStore } from '@/store/useStore';
import { useMemo } from 'react';

export type Lang = 'en' | 'fr' | 'ar';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // ─── App ───
    'app.name': 'WansniAuto',
    'app.tagline': 'Morocco Rideshare',
    'app.slogan': 'Travel between cities, share the road',
    'app.search_title': 'Find a Ride',
    'app.publish_title': 'Publish a Trip',
    'app.loading': 'Loading...',

    // ─── Auth ───
    'auth.login': 'Sign In',
    'auth.register': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full Name',
    'auth.phone': 'Phone Number',
    'auth.role': 'I want to be a',
    'auth.role_passenger': 'Passenger',
    'auth.role_driver': 'Driver',
    'auth.forgot_password': 'Forgot password?',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.logout': 'Logout',
    'auth.delete_account': 'Delete Account',

    // ─── Nav ───
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.trips': 'My Trips',
    'nav.messages': 'Messages',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.notifications': 'Notifications',

    // ─── Search ───
    'search.from': 'From',
    'search.to': 'To',
    'search.date': 'Date',
    'search.passengers': 'Passengers',
    'search.find': 'Search',
    'search.results': 'Available Rides',
    'search.no_results': 'No rides found for this route',
    'search.price': 'MAD',

    // ─── Trip ───
    'trip.publish': 'Publish Trip',
    'trip.departure': 'Departure',
    'trip.arrival': 'Arrival',
    'trip.price': 'Price per seat',
    'trip.seats': 'Available seats',
    'trip.description': 'Description',
    'trip.book': 'Book Now',
    'trip.contact': 'Contact Driver',
    'trip.driver': 'Driver',
    'trip.car': 'Vehicle',
    'trip.amenities': 'Amenities',

    // ─── Verification ───
    'verify.title': 'Verification',
    'verify.upload': 'Upload',
    'verify.upload_success': 'Document uploaded!',
    'verify.upload_error': 'Upload failed',
    'verify.no_docs': 'Please upload at least one document',
    'verify.submitted': 'Documents submitted for review!',
    'verify.submit_error': 'Submit failed',
    'verify.approved_toast': 'Your documents have been verified!',
    'verify.rejected_toast': 'Your verification was rejected. Please re-upload.',

    // ─── Profile ───
    'profile.title': 'Profile',
    'profile.edit': 'Edit Profile',
    'profile.verified': 'Verified',
    'profile.unverified': 'Unverified',
    'profile.pending': 'Pending',
    'profile.rejected': 'Rejected',
    'profile.mode_switch': 'Switch to',
    'profile.mode_passenger': 'Passenger Mode',
    'profile.mode_driver': 'Driver Mode',
    'profile.my_trips': 'My Trips',
    'profile.earnings': 'Earnings',
    'profile.rating': 'Rating',
    'profile.reviews': 'Reviews',
    'profile.verification_center': 'Verification Center',

    // ─── Messages ───
    'msg.title': 'Messages',
    'msg.no_messages': 'No messages yet',
    'msg.type_here': 'Type a message...',
    'msg.send': 'Send',
    'msg.cannot_self': 'You cannot message yourself',
    'msg.driver_only': 'Only drivers and passengers can message each other',

    // ─── Admin ───
    'admin.panel': 'Admin Panel',
    'admin.users': 'Users',
    'admin.verifications': 'Verifications',
    'admin.trips': 'Trips',
    'admin.messages': 'Messages',
    'admin.settings': 'Settings',
    'admin.support': 'Support Tickets',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.reason': 'Reason for rejection',
    'admin.no_pending': 'No pending verifications',

    // ─── Mode ───
    'mode.passenger': 'Passenger',
    'mode.driver': 'Driver',
    'mode.switch_to_passenger': 'Switch to Passenger',
    'mode.switch_to_driver': 'Switch to Driver',

    // ─── Common ───
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.see_all': 'See All',
    'common.view': 'View',

    // ─── Footer ───
    'footer.company': 'Company',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.about': 'About Us',
    'footer.how_it_works': 'How It Works',
    'footer.careers': 'Careers',
    'footer.help': 'Help Center',
    'footer.contact': 'Contact Us',
    'footer.safety': 'Safety',
    'footer.faq': 'FAQs',
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.driver_agreement': 'Driver Agreement',

    // ─── Notifications ───
    'notif.title': 'Notifications',
    'notif.mark_all_read': 'Mark all as read',
    'notif.no_notifications': 'No notifications',
    'notif.verified': 'Your documents have been verified!',
    'notif.rejected': 'Your verification was rejected',
  },

  fr: {
    // ─── App ───
    'app.name': 'WansniAuto',
    'app.tagline': 'Covoiturage Maroc',
    'app.slogan': 'Voyagez entre les villes, partagez la route',
    'app.search_title': 'Trouver un Trajet',
    'app.publish_title': 'Publier un Trajet',
    'app.loading': 'Chargement...',

    // ─── Auth ───
    'auth.login': 'Connexion',
    'auth.register': 'Inscription',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.name': 'Nom complet',
    'auth.phone': 'Numéro de téléphone',
    'auth.role': 'Je veux être',
    'auth.role_passenger': 'Passager',
    'auth.role_driver': 'Conducteur',
    'auth.forgot_password': 'Mot de passe oublié?',
    'auth.no_account': 'Pas de compte?',
    'auth.has_account': 'Déjà un compte?',
    'auth.logout': 'Déconnexion',
    'auth.delete_account': 'Supprimer le compte',

    // ─── Nav ───
    'nav.home': 'Accueil',
    'nav.search': 'Recherche',
    'nav.trips': 'Mes Trajets',
    'nav.messages': 'Messages',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.notifications': 'Notifications',

    // ─── Search ───
    'search.from': 'Départ',
    'search.to': 'Arrivée',
    'search.date': 'Date',
    'search.passengers': 'Passagers',
    'search.find': 'Rechercher',
    'search.results': 'Trajets disponibles',
    'search.no_results': 'Aucun trajet trouvé',
    'search.price': 'MAD',

    // ─── Trip ───
    'trip.publish': 'Publier Trajet',
    'trip.departure': 'Départ',
    'trip.arrival': 'Arrivée',
    'trip.price': 'Prix par place',
    'trip.seats': 'Places disponibles',
    'trip.description': 'Description',
    'trip.book': 'Réserver',
    'trip.contact': 'Contacter',
    'trip.driver': 'Conducteur',
    'trip.car': 'Véhicule',
    'trip.amenities': 'Équipements',

    // ─── Verification ───
    'verify.title': 'Vérification',
    'verify.upload': 'Télécharger',
    'verify.upload_success': 'Document téléchargé!',
    'verify.upload_error': 'Échec du téléchargement',
    'verify.no_docs': 'Veuillez télécharger au moins un document',
    'verify.submitted': 'Documents soumis pour révision!',
    'verify.submit_error': 'Échec de soumission',
    'verify.approved_toast': 'Vos documents ont été vérifiés!',
    'verify.rejected_toast': 'Votre vérification a été rejetée. Veuillez re-télécharger.',

    // ─── Profile ───
    'profile.title': 'Profil',
    'profile.edit': 'Modifier le Profil',
    'profile.verified': 'Vérifié',
    'profile.unverified': 'Non vérifié',
    'profile.pending': 'En attente',
    'profile.rejected': 'Rejeté',
    'profile.mode_switch': 'Passer en',
    'profile.mode_passenger': 'Mode Passager',
    'profile.mode_driver': 'Mode Conducteur',
    'profile.my_trips': 'Mes Trajets',
    'profile.earnings': 'Revenus',
    'profile.rating': 'Note',
    'profile.reviews': 'Avis',
    'profile.verification_center': 'Centre de Vérification',

    // ─── Messages ───
    'msg.title': 'Messages',
    'msg.no_messages': 'Aucun message',
    'msg.type_here': 'Écrivez un message...',
    'msg.send': 'Envoyer',
    'msg.cannot_self': 'Vous ne pouvez pas vous envoyer de message',
    'msg.driver_only': 'Seuls conducteurs et passagers peuvent communiquer',

    // ─── Admin ───
    'admin.panel': 'Panneau Admin',
    'admin.users': 'Utilisateurs',
    'admin.verifications': 'Vérifications',
    'admin.trips': 'Trajets',
    'admin.messages': 'Messages',
    'admin.settings': 'Paramètres',
    'admin.support': 'Tickets Support',
    'admin.approve': 'Approuver',
    'admin.reject': 'Rejeter',
    'admin.reason': 'Raison du rejet',
    'admin.no_pending': 'Aucune vérification en attente',

    // ─── Mode ───
    'mode.passenger': 'Passager',
    'mode.driver': 'Conducteur',
    'mode.switch_to_passenger': 'Passer en mode Passager',
    'mode.switch_to_driver': 'Passer en mode Conducteur',

    // ─── Common ───
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.submit': 'Soumettre',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.done': 'Terminé',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.warning': 'Attention',
    'common.info': 'Info',
    'common.see_all': 'Voir tout',
    'common.view': 'Voir',

    // ─── Footer ───
    'footer.company': 'Entreprise',
    'footer.support': 'Support',
    'footer.legal': 'Légal',
    'footer.about': 'À propos',
    'footer.how_it_works': 'Comment ça marche',
    'footer.careers': 'Carrières',
    'footer.help': 'Centre d\'aide',
    'footer.contact': 'Contact',
    'footer.safety': 'Sécurité',
    'footer.faq': 'FAQs',
    'footer.terms': 'Conditions',
    'footer.privacy': 'Confidentialité',
    'footer.cookies': 'Cookies',
    'footer.driver_agreement': 'Accord Conducteur',

    // ─── Notifications ───
    'notif.title': 'Notifications',
    'notif.mark_all_read': 'Tout marquer comme lu',
    'notif.no_notifications': 'Aucune notification',
    'notif.verified': 'Vos documents ont été vérifiés!',
    'notif.rejected': 'Votre vérification a été rejetée',
  },

  ar: {
    // ─── App ───
    'app.name': 'WansniAuto',
    'app.tagline': 'كوڤويتوراج المغرب',
    'app.slogan': 'سافر بين المدن، شارك الطريق',
    'app.search_title': 'قلب على رحلة',
    'app.publish_title': 'انشر رحلة',
    'app.loading': 'جاري التحميل...',

    // ─── Auth ───
    'auth.login': 'دخول',
    'auth.register': 'تسجيل',
    'auth.email': 'الإيميل',
    'auth.password': 'الرقم السري',
    'auth.name': 'الاسم الكامل',
    'auth.phone': 'رقم الهاتف',
    'auth.role': 'بغيت نكون',
    'auth.role_passenger': 'مسافر',
    'auth.role_driver': 'سائق',
    'auth.forgot_password': 'نسيت الرقم السري؟',
    'auth.no_account': 'م عندكش حساب؟',
    'auth.has_account': 'عندك حساب؟',
    'auth.logout': 'خروج',
    'auth.delete_account': 'حذف الحساب',

    // ─── Nav ───
    'nav.home': 'الرئيسية',
    'nav.search': 'البحث',
    'nav.trips': 'رحلاتي',
    'nav.messages': 'الرسائل',
    'nav.profile': 'البروفايل',
    'nav.settings': 'الإعدادات',
    'nav.notifications': 'الإشعارات',

    // ─── Search ───
    'search.from': 'من',
    'search.to': 'الى',
    'search.date': 'التاريخ',
    'search.passengers': 'المسافرين',
    'search.find': 'قلب',
    'search.results': 'رحلات متاحة',
    'search.no_results': 'ما لقيناش رحلات',
    'search.price': 'درهم',

    // ─── Trip ───
    'trip.publish': 'انشر رحلة',
    'trip.departure': 'المغادرة',
    'trip.arrival': 'الوصول',
    'trip.price': 'الثمن لكل كرسي',
    'trip.seats': 'الكراسي المتاحة',
    'trip.description': 'الوصف',
    'trip.book': 'احجز',
    'trip.contact': 'تواصل مع السائق',
    'trip.driver': 'السائق',
    'trip.car': 'السيارة',
    'trip.amenities': 'المرافق',

    // ─── Verification ───
    'verify.title': 'التحقق',
    'verify.upload': 'حمّل',
    'verify.upload_success': 'تم التحميل!',
    'verify.upload_error': 'فشل التحميل',
    'verify.no_docs': 'حمّل وثيقة على الأقل',
    'verify.submitted': 'تم إرسال الوثائق!',
    'verify.submit_error': 'فشل الإرسال',
    'verify.approved_toast': 'تم قبول وثائقك!',
    'verify.rejected_toast': 'تم رفض التحقق ديالك. عاود التحميل.',

    // ─── Profile ───
    'profile.title': 'البروفايل',
    'profile.edit': 'تعديل البروفايل',
    'profile.verified': 'مفحوص',
    'profile.unverified': 'مفحوصش',
    'profile.pending': 'قيد المراجعة',
    'profile.rejected': 'مرفوض',
    'profile.mode_switch': 'بدّل الى',
    'profile.mode_passenger': 'وضعية المسافر',
    'profile.mode_driver': 'وضعية السائق',
    'profile.my_trips': 'رحلاتي',
    'profile.earnings': 'الدخل',
    'profile.rating': 'التقييم',
    'profile.reviews': 'الآراء',
    'profile.verification_center': 'مركز التحقق',

    // ─── Messages ───
    'msg.title': 'الرسائل',
    'msg.no_messages': 'ماكاينش رسائل',
    'msg.type_here': 'كتب رسالة...',
    'msg.send': 'أرسل',
    'msg.cannot_self': 'مايمكنش ترسل لراسك',
    'msg.driver_only': 'غير السائق والمسافر يقدرو يتواصلو',

    // ─── Admin ───
    'admin.panel': 'لوحة الأدمين',
    'admin.users': 'المستخدمين',
    'admin.verifications': 'التحققات',
    'admin.trips': 'الرحلات',
    'admin.messages': 'الرسائل',
    'admin.settings': 'الإعدادات',
    'admin.support': 'تذاكر الدعم',
    'admin.approve': 'قبول',
    'admin.reject': 'رفض',
    'admin.reason': 'سبب الرفض',
    'admin.no_pending': 'ماكاينش تحققات قيد المراجعة',

    // ─── Mode ───
    'mode.passenger': 'مسافر',
    'mode.driver': 'سائق',
    'mode.switch_to_passenger': 'بدّل لوضعية المسافر',
    'mode.switch_to_driver': 'بدّل لوضعية السائق',

    // ─── Common ───
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.close': 'سد',
    'common.submit': 'إرسال',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.done': 'تم',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.error': 'خطأ',
    'common.success': 'نجاح',
    'common.warning': 'تنبيه',
    'common.info': 'معلومة',
    'common.see_all': 'شوف الكل',
    'common.view': 'شوف',

    // ─── Footer ───
    'footer.company': 'الشركة',
    'footer.support': 'الدعم',
    'footer.legal': 'قانوني',
    'footer.about': 'على التطبيق',
    'footer.how_it_works': 'كيفاش كايعمل',
    'footer.careers': 'الوظائف',
    'footer.help': 'مركز المساعدة',
    'footer.contact': 'تواصل معانا',
    'footer.safety': 'الأمان',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.terms': 'الشروط',
    'footer.privacy': 'الخصوصية',
    'footer.cookies': 'الكوكيز',
    'footer.driver_agreement': 'اتفاقية السائق',

    // ─── Notifications ───
    'notif.title': 'الإشعارات',
    'notif.mark_all_read': 'علّم الكل كمقروء',
    'notif.no_notifications': 'ماكاينش إشعارات',
    'notif.verified': 'تم قبول وثائقك!',
    'notif.rejected': 'تم رفض التحقق ديالك',
  },
};

// ─── Hook ───
export function useI18n() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  const t = useMemo(() => {
    return (key: string): string => {
      return TRANSLATIONS[language]?.[key]
        ?? TRANSLATIONS.en[key]
        ?? key;
    };
  }, [language]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  return { t, dir, isRTL, lang: language, setLanguage, setLang: setLanguage };
}

// ─── Direct function (for outside components) ───
export function getTranslation(lang: Lang, key: string): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
