import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiPatch, supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Edit, Check, Shield, Star, Car, Calendar, ChevronRight, Loader2, LogOut, Upload, Globe } from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, setUser, refreshProfile } = useStore();
  const { lang, setLang, t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  // Refresh profile on mount to get latest verification status
  useEffect(() => {
    refreshProfile();
  }, []);

  // Realtime subscription for profile verification updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          const p = payload.new as any;
          if (p && user) {
            setUser({
              ...user,
              is_verified: p.is_verified,
              verification_status: p.verification_status,
            });
            if (p.is_verified && !user.is_verified) {
              toast.success('Your account has been verified!');
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const processAvatarFile = async (file: File) => {
    if (!user?.id) return;

    setIsUploading(true);
    setShowUploadMenu(false);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      try {
        await apiPatch('profiles', 'id', user.id, { avatar: url });
      } catch { /* fallback handled below */ }
      setUser({ ...user, avatar: url });
      toast.success('Avatar uploaded!');
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAvatarUrl(dataUrl);
        setUser({ ...user!, avatar: dataUrl });
        toast.success('Avatar saved locally!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
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
      toast.success('Profile saved!');
    } catch (err: any) {
      console.warn('Supabase save failed:', err.message);
      try {
        const stored = localStorage.getItem('wansniauto_profile_data');
        const existing = stored ? JSON.parse(stored) : {};
        localStorage.setItem('wansniauto_profile_data', JSON.stringify({ ...existing, ...updates }));
      } catch { /* silent */ }
      toast.success('Profile saved locally');
    }

    setUser({ ...user, ...updates });
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

  const verificationBadge = () => {
    if (user.is_verified) {
      return <span className="flex items-center gap-1 text-xs text-green-400"><Shield className="w-3 h-3" /> {t('profile.verified') || 'Verified'}</span>;
    }
    if (user.verification_status === 'submitted' || user.verification_status === 'pending') {
      return <span className="flex items-center gap-1 text-xs text-blue-400"><Shield className="w-3 h-3" /> Pending Review</span>;
    }
    if (user.verification_status === 'rejected') {
      return <span className="flex items-center gap-1 text-xs text-red-400"><Shield className="w-3 h-3" /> Rejected</span>;
    }
    return <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Shield className="w-3 h-3" /> {t('profile.unverified') || 'Unverified'}</span>;
  };

  const menuItems = [
    { icon: Shield, label: t('verify.title'), desc: t('verify.subtitle'), action: () => navigate('/verification') },
    { icon: Car, label: t('passenger.title'), desc: t('passenger.title'), action: () => navigate('/dashboard') },
    { icon: Star, label: t('profile.my_reviews'), desc: t('profile.my_reviews'), action: () => toast.info(t('common.favorite_routes')) },
    { icon: Calendar, label: t('profile.preferences'), desc: t('profile.preferences'), action: () => toast.info(t('common.favorite_routes')) },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleGalleryFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleCameraFile} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="cursor-pointer" onClick={() => setShowUploadMenu(!showUploadMenu)}>
                  {isUploading ? (
                    <div className="w-20 h-20 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img
                        src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
                      />
                      <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#FF6B00] rounded-full flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </div>
                    </>
                  )}
                </div>

                {showUploadMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full left-0 mt-2 bg-[#1B1F27] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]">
                    <button onClick={() => { galleryInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                      <Upload className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-sm text-white">Gallery</span>
                    </button>
                    <button onClick={() => { cameraInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t border-white/5">
                      <Camera className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-sm text-white">Camera</span>
                    </button>
                  </motion.div>
                )}
              </div>

              <div>
                {isEditing ? (
                  <Input value={name} onChange={e => setName(e.target.value)} className="bg-[#0F1115] border-white/10 text-white h-9 rounded-xl mb-2" />
                ) : (
                  <h1 className="text-xl font-bold text-white">{user.name || 'User'}</h1>
                )}
                <p className="text-sm text-[#A0A0A0]">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {verificationBadge()}
                  <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Star className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" /> {user.rating || 5}</span>
                </div>
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
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t('profile.bio_placeholder')} className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[80px]" />
            ) : (
              <p className="text-sm text-[#A0A0A0]">{user.bio || t('common.no_bio')}</p>
            )}
          </div>

          <div>
            <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('profile.phone')}</Label>
            {isEditing ? (
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#0F1115] border-white/10 text-white h-9 rounded-xl" />
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
              { code: 'en' as const, label: 'English', flag: 'EN' },
              { code: 'fr' as const, label: 'Francais', flag: 'FR' },
              { code: 'ar' as const, label: 'Arabe', flag: 'AR' },
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
