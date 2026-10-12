import { syncVerification } from '@/lib/verify';
import { useState, useEffect, useCallback } from 'react';
import { RatingBadge } from '@/components/Rating';
import { resolveAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Review } from '@/types';
import { ArrowLeft, Star, Users, MessageSquare, Moon, Lock, MapPin, Wallet, CreditCard, RefreshCcw, ThumbsUp, HelpCircle, FileText, Shield, LogOut, Trash2, ChevronRight, Loader2, X, Bell, Mail, Phone, Check, ToggleLeft, ToggleRight, Send, Heart, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
/* ─── Saved passenger type ─── */
interface SavedPassenger {
  id: string;
  name: string;
  phone: string;
  email?: string;
  created_at?: string;
}

/* ─── Payment method type ─── */
interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'cash';
  label: string;
  last4?: string;
  expiry?: string;
  is_default: boolean;
}

/* ─── Settings section type ─── */
interface SettingsSection {
  id: string;
  icon: typeof Star;
  label: string;
  desc: string;
  badge?: string | number;
  danger?: boolean;
}

/* ─── Drawer component ─── */
function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/60 z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0F1115] z-[70] overflow-y-auto border-l border-white/5"
          >
            <div className="safe-top-sticky sticky top-0 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center gap-3 z-10">
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-[#A0A0A0]" />
              </button>
              <h2 className="text-lg font-semibold text-white flex-1">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
   ═══════════════════════════════════════════════════════════ */
export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut, mode, setMode } = useStore();
  const { lang, setLang, t, dir } = useI18n();

  /* ─── Drawer state ─── */
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  /* ─── Loading states ─── */
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});

  /* ─── Reviews ─── */
  const [reviews, setReviews] = useState<Review[]>([]);

  /* ─── Saved Passengers ─── */
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([]);
  const [newPassengerName, setNewPassengerName] = useState('');
  const [newPassengerPhone, setNewPassengerPhone] = useState('');

  /* ─── Communication Preferences ─── */
  const [commPrefs, setCommPrefs] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
  });

  /* ─── Dark Mode ─── */
  const theme = useStore((st) => st.theme);
  const setTheme = useStore((st) => st.setTheme);
  const darkMode = theme === 'dark';

  /* ─── Change Password ─── */
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ─── Address ─── */
  const [address, setAddress] = useState({ street: '', city: '', postalCode: '' });

  /* ─── Payment Methods ─── */
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCVV, setNewCardCVV] = useState('');
  const [newCardLabel, setNewCardLabel] = useState('');

  /* ─── Refunds ─── */
  const [refunds, setRefunds] = useState<any[]>([]);

  /* ─── Help Center ─── (navigates to /support page) */

  /* ─── Delete Account ─── */
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  /* ─── Rate App ─── */
  const [switchingMode, setSwitchingMode] = useState(false);
    const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  /* ─── API helper ─── */
  const apiHeaders = async () => {
    const { data: s } = await supabase.auth.getSession();
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${s.session?.access_token || ''}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  };

  /* ════════════════════════════════════════════
     LOAD DATA FROM SUPABASE
     ════════════════════════════════════════════ */

  /* ─── Load Reviews ─── */
  const loadReviews = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSections(prev => ({ ...prev, reviews: true }));
    try {
      const headers = await apiHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reviews?reviewee_id=eq.${user.id}&order=created_at.desc&limit=50`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data || []);
      }
    } catch (e) { console.error('loadReviews:', e); }
    setLoadingSections(prev => ({ ...prev, reviews: false }));
  }, [user?.id]);

  /* ─── Load Saved Passengers ─── */
  const loadSavedPassengers = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSections(prev => ({ ...prev, passengers: true }));
    try {
      const localKey = `wansniauto_saved_passengers_${user.id}`;
      const stored = localStorage.getItem(localKey);
      if (stored) setSavedPassengers(JSON.parse(stored));
    } catch { /* silent */ }
    setLoadingSections(prev => ({ ...prev, passengers: false }));
  }, [user?.id]);

  /* ─── Load Payment Methods ─── */
  const loadPaymentMethods = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSections(prev => ({ ...prev, payments: true }));
    try {
      const localKey = `wansniauto_payment_methods_${user.id}`;
      const stored = localStorage.getItem(localKey);
      if (stored) {
        setPaymentMethods(JSON.parse(stored));
      } else {
        // Default payment methods
        setPaymentMethods([
          { id: 'cash', type: 'cash', label: t('settings.cash'), is_default: true },
        ]);
      }
    } catch { /* silent */ }
    setLoadingSections(prev => ({ ...prev, payments: false }));
  }, [user?.id]);

  /* ─── Load Address ─── */
  const loadAddress = useCallback(async () => {
    if (!user?.id) return;
    try {
      const localKey = `wansniauto_address_${user.id}`;
      const stored = localStorage.getItem(localKey);
      if (stored) setAddress(JSON.parse(stored));
    } catch { /* silent */ }
  }, [user?.id]);

  /* ─── Load Comm Prefs ─── */
  const loadCommPrefs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const localKey = `wansniauto_comm_prefs_${user.id}`;
      const stored = localStorage.getItem(localKey);
      if (stored) setCommPrefs(JSON.parse(stored));
    } catch { /* silent */ }
  }, [user?.id]);

  /* ─── Load Refunds ─── */
  const loadRefunds = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSections(prev => ({ ...prev, refunds: true }));
    try {
      const headers = await apiHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?passenger_id=eq.${user.id}&status=eq.cancelled&order=created_at.desc&limit=20`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setRefunds(data || []);
      }
    } catch (e) { console.error('loadRefunds:', e); }
    setLoadingSections(prev => ({ ...prev, refunds: false }));
  }, [user?.id]);

  /* ─── Initial load ─── */
  useEffect(() => {
    loadReviews();
    loadSavedPassengers();
    loadPaymentMethods();
    loadAddress();
    loadCommPrefs();
    loadRefunds();
  }, [loadReviews, loadSavedPassengers, loadPaymentMethods, loadAddress, loadCommPrefs, loadRefunds]);

  /* ════════════════════════════════════════════
     ACTION HANDLERS
     ════════════════════════════════════════════ */

  /* ─── Change Password ─── */
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('ui.password_must_be_82c7'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('ui.passwords_do_not_867c'));
      return;
    }
    setLoadingSections(prev => ({ ...prev, password: true }));
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('ui.password_updated_successfully_18eb'));
      setNewPassword('');
      setConfirmPassword('');
      setActiveDrawer(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    }
    setLoadingSections(prev => ({ ...prev, password: false }));
  };

  /* ─── Save Passenger ─── */
  const handleSavePassenger = () => {
    if (!newPassengerName.trim()) { toast.error(t('ui.name_is_required_ff0f')); return; }
    const newP: SavedPassenger = {
      id: `sp-${Date.now()}`,
      name: newPassengerName.trim(),
      phone: newPassengerPhone.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [newP, ...savedPassengers];
    setSavedPassengers(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_saved_passengers_${user.id}`, JSON.stringify(updated));
    }
    setNewPassengerName('');
    setNewPassengerPhone('');
    toast.success(t('ui.passenger_saved_e4b2'));
  };

  const handleDeletePassenger = (id: string) => {
    const updated = savedPassengers.filter(p => p.id !== id);
    setSavedPassengers(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_saved_passengers_${user.id}`, JSON.stringify(updated));
    }
    toast.success(t('ui.passenger_removed_3e7e'));
  };

  /* ─── Save Address ─── */
  const handleSaveAddress = () => {
    if (user?.id) {
      localStorage.setItem(`wansniauto_address_${user.id}`, JSON.stringify(address));
    }
    toast.success(t('ui.address_saved_2b51'));
  };

  /* ─── Save Comm Prefs ─── */
  const handleSaveCommPrefs = () => {
    if (user?.id) {
      localStorage.setItem(`wansniauto_comm_prefs_${user.id}`, JSON.stringify(commPrefs));
    }
    toast.success(t('ui.preferences_saved_1b99'));
  };

  /* ─── Add Payment Method ─── */
  const handleAddCard = () => {
    if (!newCardNumber || newCardNumber.length < 16) { toast.error(t('ui.valid_card_number_5e85')); return; }
    if (!newCardExpiry || !newCardCVV) { toast.error(t('ui.expiry_and_cvv_42d3')); return; }

    const newMethod: PaymentMethod = {
      id: `card-${Date.now()}`,
      type: 'card',
      label: newCardLabel || `Card ending in ${newCardNumber.slice(-4)}`,
      last4: newCardNumber.slice(-4),
      expiry: newCardExpiry,
      is_default: paymentMethods.length === 0,
    };
    const updated = [...paymentMethods, newMethod];
    setPaymentMethods(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_payment_methods_${user.id}`, JSON.stringify(updated));
    }
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCVV('');
    setNewCardLabel('');
    toast.success(t('ui.card_added_1f31'));
  };

  const handleSetDefaultPayment = (id: string) => {
    const updated = paymentMethods.map(m => ({ ...m, is_default: m.id === id }));
    setPaymentMethods(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_payment_methods_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleDeletePayment = (id: string) => {
    const updated = paymentMethods.filter(m => m.id !== id);
    setPaymentMethods(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_payment_methods_${user.id}`, JSON.stringify(updated));
    }
    toast.success(t('ui.payment_method_removed_7132'));
  };

  /* ─── Rate App ─── */
  const handleRateApp = () => {
    if (userRating === 0) { toast.error(t('ui.please_select_a_39b3')); return; }
    const ratings = JSON.parse(localStorage.getItem('wansniauto_app_ratings') || '[]');
    ratings.push({ user_id: user?.id, rating: userRating, comment: ratingComment, date: new Date().toISOString() });
    localStorage.setItem('wansniauto_app_ratings', JSON.stringify(ratings));
    toast.success(t('settings.thanks_rating', { n: userRating }));
    setUserRating(0);
    setRatingComment('');
    setActiveDrawer(null);
  };

  /* ─── Delete Account ─── */
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error(t('ui.please_type_delete_e3e3'));
      return;
    }
    setLoadingSections(prev => ({ ...prev, delete: true }));
    try {
      // Delete profile data
      const headers = await apiHeaders();
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user?.id}`, { method: 'DELETE', headers });

      // Sign out
      await signOut();
      toast.success(t('ui.your_account_has_cdac'));
      navigate('/');
    } catch (e) {
      toast.error(t('ui.failed_to_delete_b942'));
    }
    setLoadingSections(prev => ({ ...prev, delete: false }));
  };

  /* ─── Logout ─── */
  const handleLogout = async () => {
    await signOut();
    toast.success(t('ui.logged_out_successfully_f780'));
    navigate('/');
  };

  /* ════════════════════════════════════════════
     SECTIONS CONFIG
     ════════════════════════════════════════════ */

  const allSections: SettingsSection[] = [
    { id: 'reviews',       icon: Star,        label: t('settings.reviews'),       desc: `${reviews.length} ${t('settings.reviews_count')}`,          badge: reviews.length || undefined },
    { id: 'passengers',    icon: Users,       label: t('settings.passengers'),    desc: `${savedPassengers.length} ${t('settings.passengers_saved')}`, badge: savedPassengers.length || undefined },
    { id: 'communication', icon: MessageSquare, label: t('settings.communication'), desc: t('settings.communication_desc') },
    { id: 'darkmode',      icon: Moon,        label: t('settings.dark_mode'),     desc: darkMode ? t('settings.dark_mode_on') : t('settings.dark_mode_off') },
    { id: 'password',      icon: Lock,        label: t('settings.password'),      desc: t('settings.password_desc') },
    { id: 'address',       icon: MapPin,      label: t('settings.address'),       desc: address.city || t('settings.address_add') },
    { id: 'payouts',       icon: Wallet,      label: t('settings.payouts'),       desc: t('settings.payouts_desc') },
    { id: 'payments',      icon: CreditCard,  label: t('settings.payments'),      desc: `${paymentMethods.length} ${t('settings.payments_count')}`,    badge: paymentMethods.length || undefined },
    { id: 'refunds',       icon: RefreshCcw,  label: t('settings.refunds'),       desc: `${refunds.length} ${t('settings.refunds_count')}`,            badge: refunds.length || undefined },
    { id: 'rate',          icon: ThumbsUp,    label: t('settings.rate'),          desc: t('settings.rate_desc') },
    { id: 'account_type', icon: Car, label: mode === 'driver' ? t('mode.to_passenger') : t('mode.to_driver'), desc: mode === 'driver' ? t('mode.to_passenger_desc') : t('mode.to_driver_desc') },
    { id: 'help',          icon: HelpCircle,  label: t('settings.help'),          desc: t('settings.help_desc') },
    { id: 'terms',         icon: FileText,    label: t('settings.terms'),         desc: t('settings.terms_desc') },
    { id: 'privacy',       icon: Shield,      label: t('settings.privacy'),       desc: t('settings.privacy_desc') },
    { id: 'logout',        icon: LogOut,      label: t('settings.logout'),        desc: t('settings.logout_desc'),  danger: true },
    { id: 'delete',        icon: Trash2,      label: t('settings.delete'),        desc: t('settings.delete_desc'), danger: true },
  ];

  // Admin account: only account/security basics, none of the passenger/driver items (no role switching).
  const ADMIN_SECTIONS = ['darkmode', 'password', 'help', 'terms', 'privacy', 'logout'];
  const sections = user?.role === 'admin' ? allSections.filter((x) => ADMIN_SECTIONS.includes(x.id)) : allSections;

  /* ════════════════════════════════════════════
     RENDER DRAWER CONTENTS
     ════════════════════════════════════════════ */

  const renderDrawerContent = () => {
    switch (activeDrawer) {
      /* ─── Reviews ─── */
      case 'reviews':
        return (
          <div className="space-y-4">
            {loadingSections.reviews ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-12 h-12 text-[#A0A0A0]/30 mx-auto mb-3" />
                <p className="text-[#A0A0A0]">{t('ui.no_reviews_yet_bc6e')}</p>
              </div>
            ) : (
              reviews.map((r: any) => (
                <div key={r.id} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-[#A0A0A0]/30'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-[#A0A0A0]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <p className="text-sm text-white">{r.comment || 'No comment'}</p>
                </div>
              ))
            )}
          </div>
        );

      /* ─── Saved Passengers ─── */
      case 'passengers':
        return (
          <div className="space-y-4">
            {/* Add new */}
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white">{t('ui.add_passenger_f2d7')}</h3>
              <Input value={newPassengerName} onChange={e => setNewPassengerName(e.target.value)} placeholder={t('ui.full_name_f11b')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={newPassengerPhone} onChange={e => setNewPassengerPhone(e.target.value)} placeholder={t('ui.phone_number_1f82')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleSavePassenger} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <Heart className="w-4 h-4 mr-2" /> {t('settings.save_passenger')}
              </Button>
            </div>
            {/* List */}
            {savedPassengers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-[#A0A0A0]/30 mx-auto mb-2" />
                <p className="text-[#A0A0A0] text-sm">{t('ui.no_saved_passengers_b3ac')}</p>
              </div>
            ) : (
              savedPassengers.map(p => (
                <div key={p.id} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-[#A0A0A0]">{p.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePassenger(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        );

      /* ─── Communication ─── */
      case 'communication':
        return (
          <div className="space-y-4">
            {[
              { key: 'pushNotifications' as const, icon: Bell, label: t('ui.push_notifications_3157'), desc: t('ui.receive_push_notifications_e769') },
              { key: 'emailNotifications' as const, icon: Mail, label: t('ui.email_notifications_3caa'), desc: t('ui.receive_email_updates_cd50') },
              { key: 'smsNotifications' as const, icon: Phone, label: t('ui.sms_notifications_73af'), desc: t('ui.receive_text_messages_c529') },
              { key: 'marketingEmails' as const, icon: MessageSquare, label: t('ui.marketing_emails_0f52'), desc: t('ui.promotions_and_offers_707c') },
            ].map(item => (
              <div key={item.key} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-[#FF6B00]" />
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-[#A0A0A0]">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setCommPrefs(p => ({ ...p, [item.key]: !p[item.key] })); }}
                  className="transition-colors"
                >
                  {commPrefs[item.key] ?
                    <ToggleRight className="w-8 h-8 text-[#FF6B00]" /> :
                    <ToggleLeft className="w-8 h-8 text-[#A0A0A0]" />
                  }
                </button>
              </div>
            ))}
            <Button onClick={handleSaveCommPrefs} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl mt-4">
              <Check className="w-4 h-4 mr-2" /> {t('settings.save_prefs')}
            </Button>
          </div>
        );

      /* ─── Dark Mode ─── */
      case 'darkmode':
        return (
          <div className="space-y-4">
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <p className="text-sm font-medium text-white">{t('ui.dark_mode_51b5')}</p>
                  <p className="text-xs text-[#A0A0A0]">{darkMode ? t('settings.dark_mode_on') : t('settings.dark_mode_off')}</p>
                </div>
              </div>
              <button onClick={() => { setTheme(darkMode ? 'light' : 'dark'); toast.success(darkMode ? t('settings.dark_toast_off') : t('settings.dark_toast_on')); }}>
                {darkMode ? <ToggleRight className="w-8 h-8 text-[#FF6B00]" /> : <ToggleLeft className="w-8 h-8 text-[#A0A0A0]" />}
              </button>
            </div>
          </div>
        );

      /* ─── Change Password ─── */
      case 'password':
        return (
          <div className="space-y-4">
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white mb-2">{t('ui.new_password_ae3b')}</h3>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('ui.new_password_min_0463')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('ui.confirm_new_password_6ab9')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button
                onClick={handleChangePassword}
                disabled={loadingSections.password}
                className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl"
              >
                {loadingSections.password ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> {t('ui.update_password_bb78')}</>}
              </Button>
            </div>
          </div>
        );

      /* ─── Address ─── */
      case 'address':
        return (
          <div className="space-y-4">
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <Input value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} placeholder={t('ui.street_address_669a')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} placeholder={t('ui.city_57d0')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={address.postalCode} onChange={e => setAddress(p => ({ ...p, postalCode: e.target.value }))} placeholder={t('ui.postal_code_572e')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleSaveAddress} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <Check className="w-4 h-4 mr-2" /> {t('settings.save_address')}
              </Button>
            </div>
          </div>
        );

      /* ─── Payouts ─── */
      case 'payouts':
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#FF6B00]/10 to-[#FF6B00]/5 rounded-xl p-5 border border-[#FF6B00]/20 text-center">
              <Wallet className="w-10 h-10 text-[#FF6B00] mx-auto mb-2" />
              <p className="text-sm text-[#A0A0A0]">{t('ui.available_balance_d6df')}</p>
              <p className="text-3xl font-bold text-white mt-1">0 {t('trip.price')}</p>
            </div>
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
              <p className="text-sm font-medium text-white mb-3">{t('ui.payout_method_44ca')}</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0F1115] border border-white/5">
                <CreditCard className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <p className="text-sm text-white">{t('ui.bank_transfer_3726')}</p>
                  <p className="text-xs text-[#A0A0A0]">{t('ui.coming_soon_8115')}</p>
                </div>
              </div>
            </div>
            <Button disabled className="w-full bg-[#FF6B00]/50 text-white/50 rounded-xl cursor-not-allowed">
              {t('settings.withdraw_soon')}
            </Button>
          </div>
        );

      /* ─── Payment Methods ─── */
      case 'payments':
        return (
          <div className="space-y-4">
            {/* Existing methods */}
            {paymentMethods.map(m => (
              <div key={m.id} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {m.type === 'cash' ? <Wallet className="w-5 h-5 text-green-400" /> : <CreditCard className="w-5 h-5 text-[#FF6B00]" />}
                  <div>
                    <p className="text-sm font-medium text-white">{m.label}</p>
                    {m.last4 && <p className="text-xs text-[#A0A0A0]">**** {m.last4} {m.expiry && `| Exp: ${m.expiry}`}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] font-medium">{t('ui.default_7a19')}</span>}
                  {!m.is_default && (
                    <button onClick={() => handleSetDefaultPayment(m.id)} className="text-xs text-[#FF6B00] hover:underline">{t('ui.set_default_ab22')}</button>
                  )}
                  <button onClick={() => handleDeletePayment(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {/* Add new card */}
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white">{t('ui.add_card_1dd1')}</h3>
              <Input value={newCardNumber} onChange={e => setNewCardNumber(e.target.value)} placeholder={t('ui.card_number_a442')} maxLength={16} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newCardExpiry} onChange={e => setNewCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                <Input value={newCardCVV} onChange={e => setNewCardCVV(e.target.value)} placeholder="CVV" maxLength={4} type="password" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              </div>
              <Input value={newCardLabel} onChange={e => setNewCardLabel(e.target.value)} placeholder={t('ui.label_optional_9a0d')} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleAddCard} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <CreditCard className="w-4 h-4 mr-2" /> {t('ui.add_card_1dd1')}
              </Button>
            </div>
          </div>
        );

      /* ─── Refunds ─── */
      case 'refunds':
        return (
          <div className="space-y-4">
            {loadingSections.refunds ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" /></div>
            ) : refunds.length === 0 ? (
              <div className="text-center py-10">
                <RefreshCcw className="w-10 h-10 text-[#A0A0A0]/30 mx-auto mb-2" />
                <p className="text-[#A0A0A0]">{t('ui.no_refund_requests_2f53')}</p>
              </div>
            ) : (
              refunds.map((r: any) => (
                <div key={r.id} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{t('settings.booking_no', { id: r.id?.slice(0, 8) })}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 capitalize">{t(`status.${r.status}`) === `status.${r.status}` ? r.status : t(`status.${r.status}`)}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                </div>
              ))
            )}
          </div>
        );

      /* ─── Rate App ─── */
      case 'rate':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-white font-medium mb-3">{t('ui.how_is_your_ad82')}</p>
              <div className="flex items-center justify-center gap-2">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setUserRating(i)} className="transition-transform hover:scale-110">
                    <Star className={`w-10 h-10 ${i <= userRating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-[#A0A0A0]/30'}`} />
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#A0A0A0] mt-2">{userRating > 0 ? t(`rating.${userRating}`) : t('rating.tap')}</p>
            </div>
            <Textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder={t('ui.tell_us_what_8f0d')} className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[100px]" />
            <Button onClick={handleRateApp} disabled={userRating === 0} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
              <ThumbsUp className="w-4 h-4 mr-2" /> {t('settings.rate_submit')}
            </Button>
          </div>
        );

      /* ─── Help Center ─── */
      case 'help':
        return (
          <div className="space-y-4">
            {/* FAQ */}
            <div className="space-y-2">
              {[
                { q: t('faq.q1'), a: t('faq.a1') },
                { q: t('faq.q2'), a: t('faq.a2') },
                { q: t('faq.q3'), a: t('faq.a3') },
                { q: t('faq.q4'), a: t('faq.a4') },
                { q: t('faq.q8'), a: t('faq.a8') },
              ].map((faq, i) => (
                <div key={i} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                  <p className="text-sm font-medium text-white mb-1">{faq.q}</p>
                  <p className="text-xs text-[#A0A0A0]">{faq.a}</p>
                </div>
              ))}
            </div>
            {/* Contact Support Button - navigates to full support page */}
            <div className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-xl p-5 border border-[#FF6B00]/20 text-center space-y-3">
              <MessageCircle className="w-8 h-8 text-[#FF6B00] mx-auto" />
              <p className="text-sm text-white font-medium">{t('ui.need_more_help_2101')}</p>
              <p className="text-xs text-[#A0A0A0]">{t('ui.our_support_team_6300')}</p>
              <Button
                onClick={() => { setActiveDrawer(null); setTimeout(() => navigate('/support'), 300); }}
                className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl"
              >
                <Send className="w-4 h-4 mr-2" /> {t('settings.contact_support')}
              </Button>
            </div>
          </div>
        );

      /* ─── Terms ─── */
      case 'terms':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium text-base">{t('ui.terms_conditions_1d8c')}</h3>
            <p>{t('ui.by_using_wansniauto_89d9')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.1_user_responsibilities_69ce')}</h4>
            <p>{t('ui.users_must_provide_9169')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.2_driver_requirements_8b9b')}</h4>
            <p>{t('ui.drivers_must_have_bd51')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.3_payments_4e9b')}</h4>
            <p>{t('ui.fares_are_set_d985')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.4_cancellations_1c8b')}</h4>
            <p>{t('ui.cancellations_within_2_e0fa')}</p>
            <p className="text-xs text-[#A0A0A0]/60 mt-4">{t('ui.last_updated_may_5215')}</p>
          </div>
        );

      /* ─── Privacy ─── */
      case 'privacy':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium text-base">{t('ui.privacy_policy_fa2e')}</h3>
            <p>{t('ui.wansniauto_is_committed_7e28')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.1_data_we_23c8')}</h4>
            <p>{t('ui.we_collect_your_729d')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.2_how_we_30b4')}</h4>
            <p>{t('ui.your_data_is_b1d5')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.3_data_sharing_28a8')}</h4>
            <p>{t('ui.we_only_share_60de')}</p>
            <h4 className="text-white font-medium mt-3">{t('ui.4_your_rights_40f3')}</h4>
            <p>{t('ui.you_can_access_0bb9')}</p>
            <p className="text-xs text-[#A0A0A0]/60 mt-4">{t('ui.last_updated_may_5215')}</p>
          </div>
        );

      /* ─── Delete Account ─── */
      case 'delete':
        return (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-red-400 font-medium mb-2">{t('ui.delete_your_account_e208')}</h3>
              <p className="text-sm text-[#A0A0A0]">{t('ui.this_action_cannot_7d2c')}</p>
            </div>
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <p className="text-sm text-white">{t('settings.type_to_confirm_pre')} <span className="font-mono text-red-400">DELETE</span> {t('settings.type_to_confirm_post')}</p>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={t('ui.type_delete_0130')} className="bg-[#0F1115] border-red-500/30 text-white rounded-xl font-mono" />
              <Button
                onClick={handleDeleteAccount}
                disabled={loadingSections.delete || deleteConfirmText !== 'DELETE'}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-30"
              >
                {loadingSections.delete ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> {t('ui.permanently_delete_account_4a3e')}</>}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ════════════════════════════════════════════
     MAIN RENDER
     ════════════════════════════════════════════ */

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">{t('ui.please_login_to_93e7')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/profile')} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white" dir={dir}>{t('settings.title')}</h1>
            <p className="text-sm text-[#A0A0A0]">{user.email}</p>
          </div>
        </div>

        {/* User Summary Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-5 mb-6 flex items-center gap-4">
          <img
            src={resolveAvatar(user.avatar, user.id)}
            alt={user.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
          />
          <div className="flex-1">
            <p className="text-white font-semibold">{user.name}</p>
            <p className="text-xs text-[#A0A0A0]">{t(`settings.role.${user.role === 'driver' ? 'driver' : user.role === 'admin' ? 'admin' : 'passenger'}`)} &middot; {user.phone || t('settings.no_phone')}</p>
          </div>
          <div className="text-right">
            <RatingBadge rating={user.rating} count={user.rating_count} iconClass="w-4 h-4" textClass="text-white font-medium" />
          </div>
        </motion.div>

        {/* Language Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
            <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-3">{t('settings.language')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['en', 'fr', 'ar'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); toast.success(t('settings.lang_changed')); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    lang === l ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-white/10 text-white hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold block">{l.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-1">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.button
                key={section.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  if (section.id === 'logout') { handleLogout(); return; }
                  if (section.id === 'darkmode') { setActiveDrawer('darkmode'); return; }
                  setActiveDrawer(section.id);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors text-left ${
                  section.danger ? 'hover:bg-red-500/5' : 'hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  section.danger ? 'bg-red-500/10' : 'bg-[#FF6B00]/10'
                }`}>
                  <Icon className={`w-5 h-5 ${section.danger ? 'text-red-400' : 'text-[#FF6B00]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${section.danger ? 'text-red-400' : 'text-white'}`}>{section.label}</p>
                  <p className="text-xs text-[#A0A0A0] truncate">{section.desc}</p>
                </div>
                {section.badge !== undefined && Number(section.badge) > 0 && (
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs font-bold flex items-center justify-center">
                    {section.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#A0A0A0] shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* App Version */}
        <p className="text-center text-[10px] text-[#A0A0A0]/40 mt-8">Redeo v2.0.0</p>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!activeDrawer}
        onClose={() => setActiveDrawer(null)}
        title={sections.find(s => s.id === activeDrawer)?.label || ''}
      >
        {renderDrawerContent()}

        {/* ─── Account Type Switch Drawer ─── */}
        <Drawer open={activeDrawer === 'account_type'} onClose={() => setActiveDrawer(null)} title={mode === 'driver' ? t('mode.to_passenger') : t('mode.to_driver')}>
          <div className="space-y-5">
            {/* Current mode */}
            <div className="bg-[#1B1F27] rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'driver' ? 'bg-[#FF6B00]/10' : 'bg-blue-500/10'}`}>
                {mode === 'driver' ? <Car className="w-5 h-5 text-[#FF6B00]" /> : <Users className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('mode.current')} <span className={mode === 'driver' ? 'text-[#FF6B00]' : 'text-blue-400'}>{mode === 'driver' ? t('settings.role.driver') : t('settings.role.passenger')}</span></p>
                <p className="text-xs text-[#A0A0A0]">{mode === 'driver' ? t('mode.can_offer') : t('mode.can_book')}</p>
              </div>
            </div>

            {mode === 'passenger' ? (
              /* Passenger → Driver */
              <div className="space-y-4">
                <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-[#FF6B00] mb-1">{t('ui.become_a_driver_1cac')}</p>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    {t('ui.to_offer_rides_9160')}
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    t('ui.national_id_front_fc1f'),
                    t('ui.selfie_with_national_6004'),
                    t('ui.driver_license_1082'),
                    t('ui.insurance_certificate_583d'),
                    t('ui.vehicle_photos_0c74'),
                  ].map((item) => (
                    <p key={item} className="text-xs text-[#A0A0A0] flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />{item}</p>
                  ))}
                </div>
                <Button
                  disabled={switchingMode}
                  onClick={async () => {
                    setSwitchingMode(true);
                    try {
                      await supabase.from('profiles').update({ role: 'driver' }).eq('id', user!.id);
                      setMode('driver');
                      await syncVerification();
                      toast.success(t('ui.driver_mode_enabled_ea7b'));
                      setActiveDrawer(null);
                      navigate('/verification');
                    } catch { toast.error(t('ui.error_while_switching_4915')); }
                    setSwitchingMode(false);
                  }}
                  className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 font-semibold"
                >
                  {switchingMode ? <Loader2 className="w-5 h-5 animate-spin" /> : t('ui.start_driver_verification_f152')}
                </Button>
              </div>
            ) : (
              /* Driver → Passenger */
              <div className="space-y-4">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-400 mb-1">{t('ui.switch_to_passenger_d321')}</p>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">
                    {t('ui.you_will_switch_f5cd')}
                  </p>
                </div>
                <Button
                  disabled={switchingMode}
                  onClick={async () => {
                    setSwitchingMode(true);
                    try {
                      await supabase.from('profiles').update({ role: 'passenger' }).eq('id', user!.id);
                      setMode('passenger');
                      await syncVerification();
                      toast.success(t('ui.passenger_mode_enabled_06dc'));
                      setActiveDrawer(null);
                      setTimeout(() => navigate('/dashboard'), 300);
                    } catch { toast.error(t('ui.error_while_switching_4915')); }
                    setSwitchingMode(false);
                  }}
                  className="w-full bg-blue-500 text-white hover:bg-blue-600 rounded-xl h-12 font-semibold"
                >
                  {switchingMode ? <Loader2 className="w-5 h-5 animate-spin" /> : t('mode.switch_btn')}
                </Button>
              </div>
            )}
          </div>
        </Drawer>

        </Drawer>
    </div>
  );
}
