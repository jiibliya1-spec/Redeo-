import { useState, useRef, useEffect, useCallback } from 'react';
import { RatingBadge } from '@/components/Rating';
import { resolveAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiPatch, supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/services/storageService';
import { AvatarPickerSheet } from '@/components/AvatarPickerSheet';
import { syncVerification } from '@/lib/verify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Edit, Check, Shield, Star, ChevronRight, Loader2, LogOut, Globe, Users, RefreshCw, Settings, Clock, Wallet } from 'lucide-react';
import { Car } from '@/components/icons/CarIcon';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, setUser } = useStore();
  const { lang, setLang, t } = useI18n();

  const [walletBal, setWalletBal] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const dirtyRef = useRef(false); // user is typing → background profile refreshes must not overwrite the form
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time profile state (separate from cached user)
  const [profileStatus, setProfileStatus] = useState<string>('unverified');
  const [profileVerified, setProfileVerified] = useState(false);
  const [profileRole, setProfileRole] = useState('passenger');
  const profileVerifiedRef = useRef(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ─── Direct fetch from Supabase (always fresh) ───
  const fetchFreshProfile = useCallback(async () => {
    const currentUser = useStore.getState().user;
    if (!currentUser?.id) return;
    setIsRefreshing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';
      const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` };

      // Fetch profile and verifications in parallel
      const [profileRes, verifRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=is_verified,verification_status,role&id=eq.${currentUser.id}&limit=1`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/verifications?select=status&user_id=eq.${currentUser.id}`,
          { headers }
        ),
      ]);

      let derivedVerified = false;
      let derivedStatus = 'unverified';
      let derivedRole = 'passenger';

      // 1. Read profile fields
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData?.length > 0) {
          const p = profileData[0];
          derivedRole = p.role || 'passenger';
          derivedVerified = p.is_verified === true;
          derivedStatus = p.verification_status || 'unverified';
        }
      }

      // 2. Override with verifications table (source of truth when admin approves)
      if (verifRes.ok) {
        const verifData: { status: string }[] = await verifRes.json();
        if (verifData?.length > 0) {
          const allApproved = verifData.every(
            (v) => v.status === 'approved' || v.status === 'verified'
          );
          const anyApproved = verifData.some(
            (v) => v.status === 'approved' || v.status === 'verified'
          );
          const anyPending = verifData.some(
            (v) => v.status === 'pending' || v.status === 'uploaded' || v.status === 'submitted'
          );
          const anyRejected = verifData.some((v) => v.status === 'rejected');

          if (allApproved) {
            derivedVerified = true;
            derivedStatus = 'verified';
          } else if (anyRejected) {
            derivedStatus = 'rejected';
            derivedVerified = false;
          } else if (anyPending || anyApproved) {
            // Has some docs uploaded/pending — don't downgrade if profile already says verified
            if (!derivedVerified) derivedStatus = 'pending';
          }
        }
      }

      setProfileVerified(derivedVerified);
      setProfileStatus(derivedStatus);
      setProfileRole(derivedRole);

      // Sync global store
      const freshUser = useStore.getState().user;
      if (freshUser) {
        setUser({
          ...freshUser,
          is_verified: derivedVerified,
          verification_status: derivedStatus as 'unverified' | 'pending' | 'submitted' | 'approved' | 'verified' | 'rejected',
          role: derivedRole as 'passenger' | 'driver' | 'admin',
        });
      }
    } catch (err: any) {
      console.error('[ProfilePage] Error:', err.message);
    }
    setIsRefreshing(false);
  }, [setUser]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      if (!dirtyRef.current) {
        setName(user.name || '');
        setBio(user.bio || '');
        setPhone(user.phone || '');
        setAvatarUrl(user.avatar || '');
      }
      // Also sync local state from user
      setProfileVerified(user.is_verified === true);
      setProfileStatus(user.verification_status || 'unverified');
      setProfileRole(user.role || 'passenger');
    }
  }, [user]);

  // ─── ALWAYS fetch fresh profile on mount ───
  useEffect(() => {
    fetchFreshProfile();
  }, [fetchFreshProfile]);

  // ─── Polling: refresh profile every 8 seconds (fallback if realtime is down) ───
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchFreshProfile();
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.id, fetchFreshProfile]);

  // Keep ref in sync so the realtime callback can read latest value without causing re-subscription
  useEffect(() => { profileVerifiedRef.current = profileVerified; }, [profileVerified]);

  // ─── Realtime: profiles + verifications (re-runs only when user.id changes) ───
  useEffect(() => {
    if (!user?.id) return;

    const uid = user.id;
    const channelName = `profile-page-${uid}-${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(channelName)
        /* profiles update */
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
          (payload) => {
            const p = payload.new as any;
            if (!p) return;
            const wasVerified = profileVerifiedRef.current;
            setProfileVerified(p.is_verified === true);
            setProfileStatus(p.verification_status || 'unverified');
            if (p.role) setProfileRole(p.role);
            const freshUser = useStore.getState().user;
            if (freshUser) {
              setUser({
                ...freshUser,
                is_verified: p.is_verified === true,
                verification_status: p.verification_status || 'unverified',
                role: (p.role || freshUser.role) as 'passenger' | 'driver' | 'admin',
              });
            }
            if (p.is_verified && !wasVerified) {
              toast.success(t('notif.verified'));
            }
          }
        )
        /* verifications update — re-derive status when admin approves/rejects a doc */
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'verifications', filter: `user_id=eq.${uid}` },
          () => {
            // Re-fetch everything to recompute derived status
            fetchFreshProfile();
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'verifications', filter: `user_id=eq.${uid}` },
          () => { fetchFreshProfile(); }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ProfilePage] Realtime subscription failed (non-critical):', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [user?.id, setUser]);

  const processAvatarFile = async (file: File) => {
    if (!user?.id) return;
    setIsUploading(true);
    setShowUploadMenu(false);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      try {
        await apiPatch('profiles', 'id', user.id, { avatar: url });
      } catch { /* silent */ }
      setUser({ ...user, avatar: url });
      void syncVerification();
      toast.success(t('ui.avatar_uploaded_e37f'));
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAvatarUrl(dataUrl);
        setUser({ ...user!, avatar: dataUrl });
        toast.success(t('ui.avatar_saved_locally_9e55'));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const pickAvatar = async (url: string) => {
    if (!user?.id) return;
    setShowUploadMenu(false);
    setAvatarUrl(url);
    try { await apiPatch('profiles', 'id', user.id, { avatar: url }); } catch { toast.error(t('avatar.err')); return; }
    setUser({ ...user, avatar: url });
    void syncVerification();
    toast.success(t('avatar.saved'));
  };

  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processAvatarFile(file);
  };

  const handleCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processAvatarFile(file);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    const updates = { name, bio, phone, avatar: avatarUrl };
    try {
      await apiPatch('profiles', 'id', user.id, updates);
      toast.success(t('ui.profile_saved_4b15'));
    } catch {
      try {
        const stored = localStorage.getItem('wansniauto_profile_data');
        const existing = stored ? JSON.parse(stored) : {};
        localStorage.setItem('wansniauto_profile_data', JSON.stringify({ ...existing, ...updates }));
      } catch { /* silent */ }
      toast.success(t('ui.profile_saved_locally_7702'));
    }
    dirtyRef.current = false;
    setUser({ ...user, ...updates });
    void syncVerification();
    setIsEditing(false);
    setIsSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">{t('auth.login')}</p>
      </div>
    );
  }

  // ─── Badge based on REAL verification_status ───
  const renderBadge = () => {
    if (profileRole === 'admin') {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
          <Shield className="w-3 h-3" /> Admin
        </span>
      );
    }

    // Check verification_status FIRST (most reliable)
    const status = profileStatus;

    if (status === 'verified' || status === 'approved' || profileVerified) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
          <Shield className="w-3 h-3" /> Verified
        </span>
      );
    }

    if (status === 'pending' || status === 'submitted') {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
          <Clock className="w-3 h-3" /> {t('status.pending')}
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
          <Shield className="w-3 h-3" /> {t('status.cancelled')}
        </span>
      );
    }

    // Default: unverified
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#A0A0A0]">
        <Shield className="w-3 h-3" /> {t('verify.title')}
      </span>
    );
  };

  // ─── (debug removed) ───

  useEffect(() => {
    if (!user?.id || profileRole !== 'driver') return;
    supabase.from('driver_wallets').select('balance').eq('driver_id', user.id).maybeSingle().then(({ data }) => setWalletBal(Number(data?.balance ?? 0)));
  }, [user?.id, profileRole]);

  const menuItems = profileRole === 'admin' ? [
    { icon: Shield, label: t('admin.panel'), desc: t('ui.manage_platform_0809'), action: () => navigate('/admin') },
    { icon: Users, label: t('admin.users'), desc: t('ui.view_all_users_23d6'), action: () => navigate('/admin/users') },
    { icon: Shield, label: t('admin.verifications'), desc: t('ui.review_driver_docs_e9c7'), action: () => navigate('/admin/verifications') },
    { icon: Car, label: t('ui.all_trips_50cd'), desc: t('ui.manage_trips_aee7'), action: () => navigate('/admin/trips') },
  ] : [
    { icon: Shield, label: t('verify.title'), desc: t('verify.subtitle'), action: () => navigate('/verification') },
    ...(profileRole === 'driver' ? [{ icon: Wallet, label: `${t('wallet.profile_balance')}: ${(walletBal ?? 0).toFixed(2)} MAD`, desc: t('wallet.profile_desc'), action: () => navigate('/wallet') }] : []),
    { icon: Car, label: t('passenger.title'), desc: t('profile.rides_desc'), action: () => navigate('/dashboard') },
    { icon: Star, label: t('profile.my_reviews'), desc: t('reviews.desc'), action: () => navigate('/reviews') },
    { icon: Settings, label: t('nav.settings'), desc: t('ui.account_preferences_e8f6'), action: () => navigate('/settings') },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleGalleryFile} />
      <AvatarPickerSheet open={showUploadMenu} onClose={() => setShowUploadMenu(false)} current={avatarUrl} isPassenger={user.role !== 'driver' && user.role !== 'admin'}
        onGallery={() => { galleryInputRef.current?.click(); setShowUploadMenu(false); }}
        onCamera={() => { cameraInputRef.current?.click(); setShowUploadMenu(false); }}
        onPick={pickAvatar} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleCameraFile} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="cursor-pointer" onClick={() => setShowUploadMenu(true)}>
                  {isUploading ? (
                    <div className="w-20 h-20 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={resolveAvatar(avatarUrl, user.id)}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
                      />
                      <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#FF6B00] rounded-full flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </div>
                    </>
                  )}
                </div>

              </div>

              <div className="flex-1">
                {isEditing ? (
                  <Input value={name} onChange={e => { dirtyRef.current = true; setName(e.target.value); }} className="bg-[#0F1115] border-white/10 text-white h-9 rounded-xl mb-2" />
                ) : (
                  <h1 className="text-xl font-bold text-white">{user.name || 'User'}</h1>
                )}
                <p className="text-sm text-[#A0A0A0]">{user.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {renderBadge()}
                  {profileRole !== 'admin' && <RatingBadge rating={user.rating} count={user.rating_count} iconClass="w-3 h-3" showCount />}
                  {/* Refresh button to force fresh fetch */}
                  <button
                    onClick={fetchFreshProfile}
                    disabled={isRefreshing}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                    title={t('ui.refresh_status_2700')}
                  >
                    <RefreshCw className={`w-3 h-3 text-[#A0A0A0] ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {/* debug removed */}
              </div>
            </div>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              disabled={isSaving || isUploading}
            >
              {isSaving ? <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" /> :
               isEditing ? <Check className="w-5 h-5 text-green-400" /> :
               <Edit className="w-5 h-5 text-[#A0A0A0]" />}
            </button>
          </div>

          <div className="mb-4">
            <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('profile.bio')}</Label>
            {isEditing ? (
              <Textarea value={bio} onChange={e => { dirtyRef.current = true; setBio(e.target.value); }} placeholder={t('profile.bio_placeholder')} className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[80px]" />
            ) : (
              <p className="text-sm text-[#A0A0A0]">{user.bio || t('common.no_bio')}</p>
            )}
          </div>

          <div>
            <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('profile.phone')}</Label>
            {isEditing ? (
              <Input value={phone} onChange={e => { dirtyRef.current = true; setPhone(e.target.value); }} className="bg-[#0F1115] border-white/10 text-white h-9 rounded-xl" />
            ) : (
              <p className="text-sm text-[#A0A0A0]">{user.phone || t('common.not_set')}</p>
            )}
          </div>
        </motion.div>

        {/* Language Selector */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-[#FF6B00]" />
            <h3 className="text-sm font-medium text-white">{t('lang.select')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { code: 'en' as const, label: t('lang.name.en'), flag: 'EN' },
              { code: 'fr' as const, label: t('lang.name.fr'), flag: 'FR' },
              { code: 'ar' as const, label: t('lang.name.ar'), flag: 'AR' },
            ]).map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  lang === l.code ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-white/10 text-white hover:border-white/20'
                }`}>
                <span className="text-xs font-bold block mb-1">{l.flag}</span>
                <span className="text-xs">{l.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Menu */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden mb-6">
          {menuItems.map((item, i) => (
            <motion.button key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={item.action}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-white font-medium">{item.label}</p>
                <p className="text-xs text-[#A0A0A0]">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#A0A0A0]" />
            </motion.button>
          ))}
        </div>

        {/* Logout */}
        <Button
          onClick={async () => { await signOut(); navigate('/'); toast.success(t('profile.logout')); }}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-12"
        >
          <LogOut className="w-4 h-4 mr-2" /> {t('profile.logout')}
        </Button>
      </div>
    </div>
  );
}
