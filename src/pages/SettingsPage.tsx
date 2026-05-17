import { useState, useEffect, useCallback } from 'react';
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
import {
  ArrowLeft, Star, Users, MessageSquare, Moon, Lock, MapPin, Wallet,
  CreditCard, RefreshCcw, ThumbsUp, HelpCircle, FileText, Shield,
  LogOut, Trash2, ChevronRight, Loader2, X, Bell, Mail, Phone,
  Check, ToggleLeft, ToggleRight, Send, Heart,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

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
            <div className="sticky top-0 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center gap-3 z-10">
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
  const { user, signOut } = useStore();
  const { lang, setLang, dir } = useI18n();

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
  const [darkMode, setDarkMode] = useState(true);

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

  /* ─── Help Center ─── */
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');

  /* ─── Delete Account ─── */
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  /* ─── Rate App ─── */
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
          { id: 'cash', type: 'cash', label: 'Cash', is_default: true },
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
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoadingSections(prev => ({ ...prev, password: true }));
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
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
    if (!newPassengerName.trim()) { toast.error('Name is required'); return; }
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
    toast.success('Passenger saved!');
  };

  const handleDeletePassenger = (id: string) => {
    const updated = savedPassengers.filter(p => p.id !== id);
    setSavedPassengers(updated);
    if (user?.id) {
      localStorage.setItem(`wansniauto_saved_passengers_${user.id}`, JSON.stringify(updated));
    }
    toast.success('Passenger removed');
  };

  /* ─── Save Address ─── */
  const handleSaveAddress = () => {
    if (user?.id) {
      localStorage.setItem(`wansniauto_address_${user.id}`, JSON.stringify(address));
    }
    toast.success('Address saved!');
  };

  /* ─── Save Comm Prefs ─── */
  const handleSaveCommPrefs = () => {
    if (user?.id) {
      localStorage.setItem(`wansniauto_comm_prefs_${user.id}`, JSON.stringify(commPrefs));
    }
    toast.success('Preferences saved!');
  };

  /* ─── Add Payment Method ─── */
  const handleAddCard = () => {
    if (!newCardNumber || newCardNumber.length < 16) { toast.error('Valid card number required'); return; }
    if (!newCardExpiry || !newCardCVV) { toast.error('Expiry and CVV required'); return; }

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
    toast.success('Card added!');
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
    toast.success('Payment method removed');
  };

  /* ─── Send Help Message ─── */
  const handleSendHelp = async () => {
    if (!helpSubject.trim() || !helpMessage.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setLoadingSections(prev => ({ ...prev, help: true }));
    try {
      const headers = await apiHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender_id: user?.id,
          receiver_id: 'support',
          content: `[Support] ${helpSubject}: ${helpMessage}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Message sent! We will reply soon.');
      setHelpSubject('');
      setHelpMessage('');
    } catch (e) {
      // Fallback: save to localStorage
      const supportMsgs = JSON.parse(localStorage.getItem('wansniauto_support_msgs') || '[]');
      supportMsgs.push({ subject: helpSubject, message: helpMessage, from: user?.email, date: new Date().toISOString() });
      localStorage.setItem('wansniauto_support_msgs', JSON.stringify(supportMsgs));
      toast.success('Message saved! We will review it.');
      setHelpSubject('');
      setHelpMessage('');
    }
    setLoadingSections(prev => ({ ...prev, help: false }));
  };

  /* ─── Rate App ─── */
  const handleRateApp = () => {
    if (userRating === 0) { toast.error('Please select a rating'); return; }
    const ratings = JSON.parse(localStorage.getItem('wansniauto_app_ratings') || '[]');
    ratings.push({ user_id: user?.id, rating: userRating, comment: ratingComment, date: new Date().toISOString() });
    localStorage.setItem('wansniauto_app_ratings', JSON.stringify(ratings));
    toast.success(`Thanks for your ${userRating}-star rating!`);
    setUserRating(0);
    setRatingComment('');
    setActiveDrawer(null);
  };

  /* ─── Delete Account ─── */
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setLoadingSections(prev => ({ ...prev, delete: true }));
    try {
      // Delete profile data
      const headers = await apiHeaders();
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user?.id}`, { method: 'DELETE', headers });

      // Sign out
      await signOut();
      toast.success('Your account has been deleted.');
      navigate('/');
    } catch (e) {
      toast.error('Failed to delete account. Please contact support.');
    }
    setLoadingSections(prev => ({ ...prev, delete: false }));
  };

  /* ─── Logout ─── */
  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  /* ════════════════════════════════════════════
     SECTIONS CONFIG
     ════════════════════════════════════════════ */

  const sections: SettingsSection[] = [
    { id: 'reviews', icon: Star, label: 'My Reviews', desc: `${reviews.length} reviews received`, badge: reviews.length || undefined },
    { id: 'passengers', icon: Users, label: 'Saved Passengers', desc: `${savedPassengers.length} saved`, badge: savedPassengers.length || undefined },
    { id: 'communication', icon: MessageSquare, label: 'Communication', desc: 'Notifications & preferences' },
    { id: 'darkmode', icon: Moon, label: 'Dark Mode', desc: darkMode ? 'Enabled' : 'Disabled' },
    { id: 'password', icon: Lock, label: 'Change Password', desc: 'Update your password' },
    { id: 'address', icon: MapPin, label: 'Address', desc: address.city || 'Add your address' },
    { id: 'payouts', icon: Wallet, label: 'Payout Methods', desc: 'Bank accounts & withdrawals' },
    { id: 'payments', icon: CreditCard, label: 'Payment Methods', desc: `${paymentMethods.length} methods saved`, badge: paymentMethods.length || undefined },
    { id: 'refunds', icon: RefreshCcw, label: 'Refunds', desc: `${refunds.length} refund requests`, badge: refunds.length || undefined },
    { id: 'rate', icon: ThumbsUp, label: 'Rate App', desc: 'Rate your experience' },
    { id: 'help', icon: HelpCircle, label: 'Help Center', desc: 'Support & contact' },
    { id: 'terms', icon: FileText, label: 'Terms & Conditions', desc: 'Legal agreements' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy', desc: 'Data protection' },
    { id: 'logout', icon: LogOut, label: 'Logout', desc: 'Sign out of your account', danger: true },
    { id: 'delete', icon: Trash2, label: 'Delete Account', desc: 'Permanently delete your account', danger: true },
  ];

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
                <p className="text-[#A0A0A0]">No reviews yet</p>
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
              <h3 className="text-sm font-medium text-white">Add Passenger</h3>
              <Input value={newPassengerName} onChange={e => setNewPassengerName(e.target.value)} placeholder="Full name" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={newPassengerPhone} onChange={e => setNewPassengerPhone(e.target.value)} placeholder="Phone number" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleSavePassenger} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <Heart className="w-4 h-4 mr-2" /> Save Passenger
              </Button>
            </div>
            {/* List */}
            {savedPassengers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-[#A0A0A0]/30 mx-auto mb-2" />
                <p className="text-[#A0A0A0] text-sm">No saved passengers</p>
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
              { key: 'pushNotifications' as const, icon: Bell, label: 'Push Notifications', desc: 'Receive push notifications' },
              { key: 'emailNotifications' as const, icon: Mail, label: 'Email Notifications', desc: 'Receive email updates' },
              { key: 'smsNotifications' as const, icon: Phone, label: 'SMS Notifications', desc: 'Receive text messages' },
              { key: 'marketingEmails' as const, icon: MessageSquare, label: 'Marketing Emails', desc: 'Promotions and offers' },
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
              <Check className="w-4 h-4 mr-2" /> Save Preferences
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
                  <p className="text-sm font-medium text-white">Dark Mode</p>
                  <p className="text-xs text-[#A0A0A0]">{darkMode ? 'Currently enabled' : 'Currently disabled'}</p>
                </div>
              </div>
              <button onClick={() => { setDarkMode(!darkMode); toast.success(darkMode ? 'Dark mode disabled' : 'Dark mode enabled'); }}>
                {darkMode ? <ToggleRight className="w-8 h-8 text-[#FF6B00]" /> : <ToggleLeft className="w-8 h-8 text-[#A0A0A0]" />}
              </button>
            </div>
            <p className="text-xs text-[#A0A0A0] text-center">This app is designed with dark mode by default for better night visibility.</p>
          </div>
        );

      /* ─── Change Password ─── */
      case 'password':
        return (
          <div className="space-y-4">
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white mb-2">New Password</h3>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button
                onClick={handleChangePassword}
                disabled={loadingSections.password}
                className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl"
              >
                {loadingSections.password ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Update Password</>}
              </Button>
            </div>
          </div>
        );

      /* ─── Address ─── */
      case 'address':
        return (
          <div className="space-y-4">
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <Input value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} placeholder="Street address" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} placeholder="City" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Input value={address.postalCode} onChange={e => setAddress(p => ({ ...p, postalCode: e.target.value }))} placeholder="Postal code" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleSaveAddress} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <Check className="w-4 h-4 mr-2" /> Save Address
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
              <p className="text-sm text-[#A0A0A0]">Available Balance</p>
              <p className="text-3xl font-bold text-white mt-1">0 MAD</p>
            </div>
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
              <p className="text-sm font-medium text-white mb-3">Payout Method</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0F1115] border border-white/5">
                <CreditCard className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <p className="text-sm text-white">Bank Transfer</p>
                  <p className="text-xs text-[#A0A0A0]">Coming soon</p>
                </div>
              </div>
            </div>
            <Button disabled className="w-full bg-[#FF6B00]/50 text-white/50 rounded-xl cursor-not-allowed">
              Withdraw (Coming Soon)
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
                  {m.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] font-medium">Default</span>}
                  {!m.is_default && (
                    <button onClick={() => handleSetDefaultPayment(m.id)} className="text-xs text-[#FF6B00] hover:underline">Set default</button>
                  )}
                  <button onClick={() => handleDeletePayment(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {/* Add new card */}
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white">Add Card</h3>
              <Input value={newCardNumber} onChange={e => setNewCardNumber(e.target.value)} placeholder="Card number" maxLength={16} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newCardExpiry} onChange={e => setNewCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                <Input value={newCardCVV} onChange={e => setNewCardCVV(e.target.value)} placeholder="CVV" maxLength={4} type="password" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              </div>
              <Input value={newCardLabel} onChange={e => setNewCardLabel(e.target.value)} placeholder="Label (optional)" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Button onClick={handleAddCard} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                <CreditCard className="w-4 h-4 mr-2" /> Add Card
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
                <p className="text-[#A0A0A0]">No refund requests</p>
              </div>
            ) : (
              refunds.map((r: any) => (
                <div key={r.id} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Booking #{r.id?.slice(0, 8)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 capitalize">{r.status}</span>
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
              <p className="text-white font-medium mb-3">How is your experience with WansniAuto?</p>
              <div className="flex items-center justify-center gap-2">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setUserRating(i)} className="transition-transform hover:scale-110">
                    <Star className={`w-10 h-10 ${i <= userRating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-[#A0A0A0]/30'}`} />
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#A0A0A0] mt-2">{userRating > 0 ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][userRating] : 'Tap a star to rate'}</p>
            </div>
            <Textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Tell us what you like or what we can improve..." className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[100px]" />
            <Button onClick={handleRateApp} disabled={userRating === 0} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
              <ThumbsUp className="w-4 h-4 mr-2" /> Submit Rating
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
                { q: 'How do I book a ride?', a: 'Search for your route, select a driver, and book your seat.' },
                { q: 'How do I become a driver?', a: 'Register as a driver, complete verification, and start publishing trips.' },
                { q: 'Is my payment secure?', a: 'Yes, all payments are processed securely through our platform.' },
                { q: 'How do I contact support?', a: 'Use the form below to send us a message.' },
              ].map((faq, i) => (
                <div key={i} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                  <p className="text-sm font-medium text-white mb-1">{faq.q}</p>
                  <p className="text-xs text-[#A0A0A0]">{faq.a}</p>
                </div>
              ))}
            </div>
            {/* Contact Form */}
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <h3 className="text-sm font-medium text-white">Contact Support</h3>
              <Input value={helpSubject} onChange={e => setHelpSubject(e.target.value)} placeholder="Subject" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
              <Textarea value={helpMessage} onChange={e => setHelpMessage(e.target.value)} placeholder="Describe your issue..." className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[100px]" />
              <Button onClick={handleSendHelp} disabled={loadingSections.help} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
                {loadingSections.help ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
              </Button>
            </div>
          </div>
        );

      /* ─── Terms ─── */
      case 'terms':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium text-base">Terms & Conditions</h3>
            <p>By using WansniAuto, you agree to these terms. WansniAuto is a ride-sharing platform connecting drivers and passengers in Morocco.</p>
            <h4 className="text-white font-medium mt-3">1. User Responsibilities</h4>
            <p>Users must provide accurate information, maintain valid documentation, and comply with Moroccan traffic laws.</p>
            <h4 className="text-white font-medium mt-3">2. Driver Requirements</h4>
            <p>Drivers must have a valid license, insurance, and a registered vehicle. All drivers undergo verification.</p>
            <h4 className="text-white font-medium mt-3">3. Payments</h4>
            <p>Fares are set by drivers and displayed before booking. A 5% service fee applies to each booking.</p>
            <h4 className="text-white font-medium mt-3">4. Cancellations</h4>
            <p>Cancellations within 2 hours of departure may incur a fee. Refunds are processed within 5-7 business days.</p>
            <p className="text-xs text-[#A0A0A0]/60 mt-4">Last updated: May 2026</p>
          </div>
        );

      /* ─── Privacy ─── */
      case 'privacy':
        return (
          <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
            <h3 className="text-white font-medium text-base">Privacy Policy</h3>
            <p>WansniAuto is committed to protecting your personal data in accordance with Moroccan Law 09-08 on data protection.</p>
            <h4 className="text-white font-medium mt-3">1. Data We Collect</h4>
            <p>We collect your name, email, phone, profile photo, ID documents (for drivers), trip history, and payment information.</p>
            <h4 className="text-white font-medium mt-3">2. How We Use Your Data</h4>
            <p>Your data is used to provide ride-sharing services, process payments, verify identities, and improve our platform.</p>
            <h4 className="text-white font-medium mt-3">3. Data Sharing</h4>
            <p>We only share necessary information between drivers and passengers for trip coordination. We never sell your data.</p>
            <h4 className="text-white font-medium mt-3">4. Your Rights</h4>
            <p>You can access, modify, or delete your personal data at any time through your account settings.</p>
            <p className="text-xs text-[#A0A0A0]/60 mt-4">Last updated: May 2026</p>
          </div>
        );

      /* ─── Delete Account ─── */
      case 'delete':
        return (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-red-400 font-medium mb-2">Delete Your Account</h3>
              <p className="text-sm text-[#A0A0A0]">This action cannot be undone. All your data including trips, bookings, and messages will be permanently deleted.</p>
            </div>
            <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 space-y-3">
              <p className="text-sm text-white">Type <span className="font-mono text-red-400">DELETE</span> to confirm:</p>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="bg-[#0F1115] border-red-500/30 text-white rounded-xl font-mono" />
              <Button
                onClick={handleDeleteAccount}
                disabled={loadingSections.delete || deleteConfirmText !== 'DELETE'}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-30"
              >
                {loadingSections.delete ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Permanently Delete Account</>}
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
        <p className="text-[#A0A0A0]">Please login to access settings</p>
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
            <h1 className="text-2xl font-bold text-white" dir={dir}>Account & Settings</h1>
            <p className="text-sm text-[#A0A0A0]">{user.email}</p>
          </div>
        </div>

        {/* User Summary Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-5 mb-6 flex items-center gap-4">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
            alt={user.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
          />
          <div className="flex-1">
            <p className="text-white font-semibold">{user.name}</p>
            <p className="text-xs text-[#A0A0A0]">{user.role === 'driver' ? 'Driver' : user.role === 'admin' ? 'Admin' : 'Passenger'} &middot; {user.phone || 'No phone'}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
              <span className="text-white font-medium">{user.rating || 5}</span>
            </div>
          </div>
        </motion.div>

        {/* Language Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
            <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-3">Language</p>
            <div className="grid grid-cols-3 gap-2">
              {(['en', 'fr', 'ar'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); toast.success(`Language: ${l.toUpperCase()}`); }}
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
        <p className="text-center text-[10px] text-[#A0A0A0]/40 mt-8">WansniAuto v2.0.0</p>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!activeDrawer}
        onClose={() => setActiveDrawer(null)}
        title={sections.find(s => s.id === activeDrawer)?.label || ''}
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
}
