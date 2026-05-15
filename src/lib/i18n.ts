import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'en' | 'fr' | 'ar';

interface I18nState {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

// ─── TRANSLATIONS ───
const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.trips': 'Trips',
    'nav.chat': 'Chat',
    'nav.profile': 'Profile',
    'nav.dashboard': 'Dashboard',
    'nav.driver': 'Driver',
    'nav.admin': 'Admin',
    'nav.verification': 'Verification',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',

    // Landing
    'hero.title': 'Share Rides. Save Money. Go Everywhere.',
    'hero.subtitle': 'The smartest way to travel between Moroccan cities. Connect with verified drivers and book your next ride in seconds.',
    'hero.search_placeholder_from': 'From where?',
    'hero.search_placeholder_to': 'To where?',
    'hero.search_date': 'Date',
    'hero.search_passengers': 'Passengers',
    'hero.search_btn': 'Search Rides',

    // Auth
    'auth.login_title': 'Welcome Back',
    'auth.register_title': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full Name',
    'auth.phone': 'Phone Number',
    'auth.role': 'I am a',
    'auth.role_passenger': 'Passenger',
    'auth.role_driver': 'Driver',
    'auth.login_btn': 'Login',
    'auth.register_btn': 'Create Account',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.forgot_password': 'Forgot password?',

    // Profile
    'profile.title': 'Profile',
    'profile.bio': 'Bio',
    'profile.bio_placeholder': 'Tell us about yourself...',
    'profile.phone': 'Phone',
    'profile.edit': 'Edit',
    'profile.save': 'Save',
    'profile.verification_center': 'Verification Center',
    'profile.my_trips': 'My Trips',
    'profile.my_reviews': 'My Reviews',
    'profile.preferences': 'Preferences',

    // Verification
    'verify.title': 'Verification Center',
    'verify.subtitle': 'Complete verification to unlock all features',
    'verify.progress': 'Progress',
    'verify.verified': 'Fully Verified',
    'verify.partial': 'Partially Verified',
    'verify.required': 'Verification Required',
    'verify.cin': 'National ID (CIN)',
    'verify.cin_desc': 'Upload front and back of your CIN',
    'verify.selfie': 'Selfie Verification',
    'verify.selfie_desc': 'Take a selfie for identity match',
    'verify.license': 'Driver License',
    'verify.license_desc': 'Upload your valid driver license',
    'verify.registration': 'Vehicle Registration',
    'verify.registration_desc': 'Upload car registration documents',
    'verify.insurance': 'Insurance',
    'verify.insurance_desc': 'Upload valid insurance certificate',
    'verify.upload_file': 'Upload File',
    'verify.camera': 'Camera',
    'verify.reupload': 'Re-upload',
    'verify.under_review': 'Under review by our team',

    // Driver Dashboard
    'driver.title': 'Driver Dashboard',
    'driver.subtitle': 'Manage your rides and earnings',
    'driver.publish': 'Publish Trip',
    'driver.earnings': 'Earnings',
    'driver.rating': 'Rating',
    'driver.trips': 'Trips',
    'driver.passengers': 'Passengers',
    'driver.from': 'From',
    'driver.to': 'To',
    'driver.date': 'Date',
    'driver.time': 'Time',
    'driver.price': 'Price (MAD)',
    'driver.seats': 'Available Seats',
    'driver.distance': 'Distance (optional)',
    'driver.duration': 'Duration (optional)',
    'driver.my_trips': 'My Published Trips',
    'driver.no_trips': 'No trips published yet',
    'driver.publish_first': 'Publish your first trip',
    'driver.vehicle_info': 'Vehicle Information Required',
    'driver.make': 'Make',
    'driver.model': 'Model',
    'driver.year': 'Year',
    'driver.color': 'Color',
    'driver.plate': 'Plate #',

    // Passenger Dashboard
    'passenger.title': 'My Trips',
    'passenger.book_ride': 'Book a Ride',
    'passenger.trips': 'Trips',
    'passenger.saved': 'Spent',
    'passenger.upcoming': 'Upcoming',
    'passenger.past': 'Past',
    'passenger.favorites': 'Favorites',
    'passenger.no_upcoming': 'No upcoming trips',
    'passenger.find_ride': 'Find a ride',
    'passenger.no_past': 'No past trips yet',

    // Search
    'search.title': 'Search Results',
    'search.filters': 'Filters',
    'search.price': 'Price',
    'search.time': 'Departure Time',
    'search.amenities': 'Amenities',
    'search.no_results': 'No rides found for this route',
    'search.try_diff': 'Try a different date or route',

    // Trip Details
    'trip.price': 'per seat',
    'trip.seats_left': 'seats left',
    'trip.driver': 'Driver',
    'trip.vehicle': 'Vehicle',
    'trip.route': 'Route',
    'trip.amenities': 'Amenities',
    'trip.book_now': 'Book Now',
    'trip.contact': 'Contact Driver',

    // Booking
    'booking.title': 'Complete Booking',
    'booking.seats': 'Number of Seats',
    'booking.total': 'Total',
    'booking.confirm': 'Confirm Booking',
    'booking.payment_method': 'Payment Method',
    'booking.pay_cash': 'Cash to Driver',
    'booking.pay_online': 'Online Payment',

    // Chat
    'chat.title': 'Messages',
    'chat.type': 'Type a message...',
    'chat.empty_title': 'Your Messages',
    'chat.empty_desc': 'Select a conversation to start chatting.',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.view': 'View',
    'common.status': 'Status',
    'common.pending': 'Pending',
    'common.confirmed': 'Confirmed',
    'common.cancelled': 'Cancelled',
    'common.completed': 'Completed',
    'common.yes': 'Yes',
    'common.no': 'No',
  },

  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.search': 'Rechercher',
    'nav.trips': 'Trajets',
    'nav.chat': 'Chat',
    'nav.profile': 'Profil',
    'nav.dashboard': 'Tableau de bord',
    'nav.driver': 'Conducteur',
    'nav.admin': 'Admin',
    'nav.verification': 'Verification',
    'nav.logout': 'Deconnexion',
    'nav.login': 'Connexion',
    'nav.register': 'Inscription',

    // Landing
    'hero.title': 'Partagez vos trajets. Economisez. Allez partout.',
    'hero.subtitle': 'Le moyen le plus intelligent de voyager entre les villes marocaines. Connectez-vous avec des conducteurs verifies et reservez votre prochain trajet en quelques secondes.',
    'hero.search_placeholder_from': "D'ou partez-vous?",
    'hero.search_placeholder_to': 'Ou allez-vous?',
    'hero.search_date': 'Date',
    'hero.search_passengers': 'Passagers',
    'hero.search_btn': 'Rechercher',

    // Auth
    'auth.login_title': 'Bon Retour',
    'auth.register_title': 'Creer un Compte',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.name': 'Nom complet',
    'auth.phone': 'Telephone',
    'auth.role': 'Je suis un',
    'auth.role_passenger': 'Passager',
    'auth.role_driver': 'Conducteur',
    'auth.login_btn': 'Connexion',
    'auth.register_btn': 'Creer un compte',
    'auth.no_account': "Pas encore de compte?",
    'auth.has_account': 'Deja un compte?',
    'auth.forgot_password': 'Mot de passe oublie?',

    // Profile
    'profile.title': 'Profil',
    'profile.bio': 'Bio',
    'profile.bio_placeholder': 'Parlez-nous de vous...',
    'profile.phone': 'Telephone',
    'profile.edit': 'Modifier',
    'profile.save': 'Enregistrer',
    'profile.verification_center': 'Centre de Verification',
    'profile.my_trips': 'Mes Trajets',
    'profile.my_reviews': 'Mes Avis',
    'profile.preferences': 'Preferences',

    // Verification
    'verify.title': 'Centre de Verification',
    'verify.subtitle': 'Completez la verification pour debloquer toutes les fonctionnalites',
    'verify.progress': 'Progression',
    'verify.verified': 'Entierement Verifie',
    'verify.partial': 'Partiellement Verifie',
    'verify.required': 'Verification Requise',
    'verify.cin': 'Carte d\'identite (CIN)',
    'verify.cin_desc': 'Telechargez le recto et verso de votre CIN',
    'verify.selfie': 'Verification Selfie',
    'verify.selfie_desc': 'Prenez un selfie pour la correspondance d\'identite',
    'verify.license': 'Permis de Conduire',
    'verify.license_desc': 'Telechargez votre permis de conduire valide',
    'verify.registration': 'Carte Grise',
    'verify.registration_desc': 'Telechargez les documents d\'immatriculation',
    'verify.insurance': 'Assurance',
    'verify.insurance_desc': 'Telechargez votre attestation d\'assurance',
    'verify.upload_file': 'Telecharger',
    'verify.camera': 'Camera',
    'verify.reupload': 'Re-telecharger',
    'verify.under_review': 'En cours de verification',

    // Driver Dashboard
    'driver.title': 'Tableau de Bord Conducteur',
    'driver.subtitle': 'Gerez vos trajets et revenus',
    'driver.publish': 'Publier un Trajet',
    'driver.earnings': 'Revenus',
    'driver.rating': 'Note',
    'driver.trips': 'Trajets',
    'driver.passengers': 'Passagers',
    'driver.from': 'De',
    'driver.to': 'A',
    'driver.date': 'Date',
    'driver.time': 'Heure',
    'driver.price': 'Prix (MAD)',
    'driver.seats': 'Places Disponibles',
    'driver.distance': 'Distance (optionnel)',
    'driver.duration': 'Duree (optionnel)',
    'driver.my_trips': 'Mes Trajets Publies',
    'driver.no_trips': 'Aucun trajet publie',
    'driver.publish_first': 'Publiez votre premier trajet',
    'driver.vehicle_info': 'Informations du Vehicule Requises',
    'driver.make': 'Marque',
    'driver.model': 'Modele',
    'driver.year': 'Annee',
    'driver.color': 'Couleur',
    'driver.plate': 'Plaque',

    // Passenger Dashboard
    'passenger.title': 'Mes Trajets',
    'passenger.book_ride': 'Reserver un Trajet',
    'passenger.trips': 'Trajets',
    'passenger.saved': 'Depense',
    'passenger.upcoming': 'A Venir',
    'passenger.past': 'Passes',
    'passenger.favorites': 'Favoris',
    'passenger.no_upcoming': 'Aucun trajet a venir',
    'passenger.find_ride': 'Trouver un trajet',
    'passenger.no_past': 'Aucun trajet passe',

    // Search
    'search.title': 'Resultats de Recherche',
    'search.filters': 'Filtres',
    'search.price': 'Prix',
    'search.time': 'Heure de Depart',
    'search.amenities': 'Commodites',
    'search.no_results': 'Aucun trajet trouve',
    'search.try_diff': 'Essayez une autre date ou route',

    // Trip Details
    'trip.price': 'par place',
    'trip.seats_left': 'places restantes',
    'trip.driver': 'Conducteur',
    'trip.vehicle': 'Vehicule',
    'trip.route': 'Itineraire',
    'trip.amenities': 'Commodites',
    'trip.book_now': 'Reserver',
    'trip.contact': 'Contacter',

    // Booking
    'booking.title': 'Completer la Reservation',
    'booking.seats': 'Nombre de Places',
    'booking.total': 'Total',
    'booking.confirm': 'Confirmer',
    'booking.payment_method': 'Mode de Paiement',
    'booking.pay_cash': 'Espèces au conducteur',
    'booking.pay_online': 'Paiement en ligne',

    // Chat
    'chat.title': 'Messages',
    'chat.type': 'Ecrivez un message...',
    'chat.empty_title': 'Vos Messages',
    'chat.empty_desc': 'Selectionnez une conversation.',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.retry': 'Reessayer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.save': 'Enregistrer',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.close': 'Fermer',
    'common.view': 'Voir',
    'common.status': 'Statut',
    'common.pending': 'En attente',
    'common.confirmed': 'Confirme',
    'common.cancelled': 'Annule',
    'common.completed': 'Termine',
    'common.yes': 'Oui',
    'common.no': 'Non',
  },

  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.search': 'بحث',
    'nav.trips': 'رحلاتي',
    'nav.chat': 'محادثات',
    'nav.profile': 'حسابي',
    'nav.dashboard': 'لوحة التحكم',
    'nav.driver': 'سائق',
    'nav.admin': 'مدير',
    'nav.verification': 'التحقق',
    'nav.logout': 'خروج',
    'nav.login': 'دخول',
    'nav.register': 'تسجيل',

    // Landing
    'hero.title': 'شارك الرحلات. وفر الفلوس. سافر لكل مكان.',
    'hero.subtitle': 'أذكى طريقة للسفر بين المدن المغربية. تواصل مع سائقين مفحوصين واحجز رحلتك فثواني.',
    'hero.search_placeholder_from': 'منين؟',
    'hero.search_placeholder_to': 'لوين؟',
    'hero.search_date': 'التاريخ',
    'hero.search_passengers': 'الركاب',
    'hero.search_btn': 'بحث',

    // Auth
    'auth.login_title': 'مرحبا بك',
    'auth.register_title': 'تسجيل حساب جديد',
    'auth.email': 'البريد',
    'auth.password': 'الرمز السري',
    'auth.name': 'الاسم الكامل',
    'auth.phone': 'الهاتف',
    'auth.role': 'أنا',
    'auth.role_passenger': 'مسافر',
    'auth.role_driver': 'سائق',
    'auth.login_btn': 'دخول',
    'auth.register_btn': 'تسجيل',
    'auth.no_account': 'م عندكش حساب؟',
    'auth.has_account': 'عندك حساب؟',
    'auth.forgot_password': 'نسيتي الرمز السري؟',

    // Profile
    'profile.title': 'حسابي',
    'profile.bio': 'نبذة',
    'profile.bio_placeholder': 'كتب شي حاجة عليك...',
    'profile.phone': 'الهاتف',
    'profile.edit': 'تعديل',
    'profile.save': 'حفظ',
    'profile.verification_center': 'مركز التحقق',
    'profile.my_trips': 'رحلاتي',
    'profile.my_reviews': 'تقييماتي',
    'profile.preferences': 'الإعدادات',

    // Verification
    'verify.title': 'مركز التحقق',
    'verify.subtitle': 'كمل التحقق باش تفتح جميع الميزات',
    'verify.progress': 'التقدم',
    'verify.verified': 'مفحوص بالكامل',
    'verify.partial': 'مفحوص جزئيا',
    'verify.required': 'التحقق ضروري',
    'verify.cin': 'بطاقة التعريف (CIN)',
    'verify.cin_desc': 'حمل الوجه الأمامي والخلفي ديال بطاقة التعريف',
    'verify.selfie': 'صورة شخصية',
    'verify.selfie_desc': 'صور راسك باش نتحققو من الهوية',
    'verify.license': 'رخصة السياقة',
    'verify.license_desc': 'حمل رخصة السياقة ديالك',
    'verify.registration': 'البطاقة الرمادية',
    'verify.registration_desc': 'حمل وثائق تسجيل السيارة',
    'verify.insurance': 'التأمين',
    'verify.insurance_desc': 'حمل شهادة التأمين',
    'verify.upload_file': 'تحميل ملف',
    'verify.camera': 'كاميرا',
    'verify.reupload': 'إعادة التحميل',
    'verify.under_review': 'فالمراجعة',

    // Driver Dashboard
    'driver.title': 'لوحة السائق',
    'driver.subtitle': 'دبر رحلاتك وفلوسك',
    'driver.publish': 'نشر رحلة',
    'driver.earnings': 'الأرباح',
    'driver.rating': 'التقييم',
    'driver.trips': 'الرحلات',
    'driver.passengers': 'الركاب',
    'driver.from': 'من',
    'driver.to': 'الى',
    'driver.date': 'التاريخ',
    'driver.time': 'الوقت',
    'driver.price': 'الثمن (درهم)',
    'driver.seats': 'الأماكن المتاحة',
    'driver.distance': 'المسافة (اختياري)',
    'driver.duration': 'المدة (اختياري)',
    'driver.my_trips': 'رحلاتي المنشورة',
    'driver.no_trips': 'م نشرتي حتى رحلة',
    'driver.publish_first': 'نشر أول رحلة',
    'driver.vehicle_info': 'معلومات السيارة ضرورية',
    'driver.make': 'الشركة',
    'driver.model': 'الموديل',
    'driver.year': 'السنة',
    'driver.color': 'اللون',
    'driver.plate': 'الرقم',

    // Passenger Dashboard
    'passenger.title': 'رحلاتي',
    'passenger.book_ride': 'حجز رحلة',
    'passenger.trips': 'الرحلات',
    'passenger.saved': 'المصروف',
    'passenger.upcoming': 'القادمة',
    'passenger.past': 'السابقة',
    'passenger.favorites': 'المفضلة',
    'passenger.no_upcoming': 'ماعندك حتى رحلة قادمة',
    'passenger.find_ride': 'قلب على رحلة',
    'passenger.no_past': 'ماعندك حتى رحلة سابقة',

    // Search
    'search.title': 'نتائج البحث',
    'search.filters': 'تصفية',
    'search.price': 'الثمن',
    'search.time': 'وقت المغادرة',
    'search.amenities': 'المرافق',
    'search.no_results': 'م لقينا حتى رحلة',
    'search.try_diff': 'جرب تاريخ أو مسار آخر',

    // Trip Details
    'trip.price': 'للكرسي',
    'trip.seats_left': 'الأماكن المتبقية',
    'trip.driver': 'السائق',
    'trip.vehicle': 'السيارة',
    'trip.route': 'المسار',
    'trip.amenities': 'المرافق',
    'trip.book_now': 'احجز دابا',
    'trip.contact': 'تواصل مع السائق',

    // Booking
    'booking.title': 'كمل الحجز',
    'booking.seats': 'عدد الأماكن',
    'booking.total': 'المجموع',
    'booking.confirm': 'أكد الحجز',
    'booking.payment_method': 'طريقة الدفع',
    'booking.pay_cash': 'نقدي للسائق',
    'booking.pay_online': 'دفع إلكتروني',

    // Chat
    'chat.title': 'المحادثات',
    'chat.type': 'كتب رسالة...',
    'chat.empty_title': 'محادثاتك',
    'chat.empty_desc': 'ختار شي محادثة باش تبدأ.',

    // Common
    'common.loading': 'تحميل...',
    'common.error': 'شي مشكلة وقعات',
    'common.retry': 'عاود',
    'common.cancel': 'لغي',
    'common.confirm': 'أكد',
    'common.save': 'حفظ',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.close': 'سد',
    'common.view': 'شوف',
    'common.status': 'الحالة',
    'common.pending': 'فالانتظار',
    'common.confirmed': 'مؤكد',
    'common.cancelled': 'ملغى',
    'common.completed': 'تما',
    'common.yes': 'ايه',
    'common.no': 'لا',
  },
};

// ─── Zustand Store ───
export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      dir: 'ltr',

      setLang: (lang) => {
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        // Update document direction
        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          document.documentElement.lang = lang;
        }
        set({ lang, dir });
      },

      t: (key: string) => {
        const { lang } = get();
        return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
      },
    }),
    {
      name: 'wansniauto-lang',
      partialize: (state) => ({ lang: state.lang }),
    }
  )
);

// Initialize on load
if (typeof document !== 'undefined') {
  const stored = localStorage.getItem('wansniauto-lang');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.lang) {
        document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = state.lang;
      }
    } catch { /* silent */ }
  }
}
