import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Edit, Check, Shield, Star, Car, Calendar, ChevronRight, Loader2, LogOut, Upload } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, setUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  // Separate refs for gallery vs camera
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  // Process uploaded avatar file
  const processAvatarFile = async (file: File) => {
    if (!user?.id) return;

    setIsUploading(true);
    setShowUploadMenu(false);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);

      // Also update Supabase profile
      try {
        await supabase.from('profiles').update({ avatar: url }).eq('id', user.id);
      } catch {
        // table may not exist
      }

      // Update local user state
      setUser({ ...user, avatar: url });
      toast.success('Avatar uploaded!');
    } catch (err: any) {
      // Fallback: show as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAvatarUrl(dataUrl);
        setUser({ ...user, avatar: dataUrl });
        toast.success('Avatar saved locally!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Gallery file handler
  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processAvatarFile(file);
  };

  // Camera file handler
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
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        saveProfileLocally(updates);
        toast.success('Profile saved locally (Supabase table not ready)');
      } else {
        toast.success('Profile saved!');
      }
    } catch {
      saveProfileLocally(updates);
      toast.success('Profile saved locally');
    }

    setUser({ ...user, ...updates });
    setIsEditing(false);
    setIsSaving(false);
  };

  const saveProfileLocally = (updates: Partial<typeof user>) => {
    try {
      const stored = localStorage.getItem('wansniauto_profile_data');
      const existing = stored ? JSON.parse(stored) : {};
      localStorage.setItem('wansniauto_profile_data', JSON.stringify({ ...existing, ...updates }));
    } catch { /* silent */ }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">Please sign in to view your profile.</p>
      </div>
    );
  }

  const menuItems = [
    { icon: Shield, label: 'Verification Center', desc: 'Verify your identity', action: () => navigate('/verification') },
    { icon: Car, label: 'My Trips', desc: 'View trip history', action: () => navigate('/dashboard') },
    { icon: Star, label: 'My Reviews', desc: 'Your ratings & reviews', action: () => toast.info('Coming soon!') },
    { icon: Calendar, label: 'Preferences', desc: 'Travel preferences', action: () => toast.info('Coming soon!') },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      {/* Hidden inputs for avatar upload */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleGalleryFile}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleCameraFile}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar with upload menu */}
              <div className="relative">
                <div
                  className="cursor-pointer"
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                >
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

                {/* Upload menu popup */}
                {showUploadMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full left-0 mt-2 bg-[#1B1F27] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px]"
                  >
                    <button
                      onClick={() => { galleryInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <Upload className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-sm text-white">Gallery</span>
                    </button>
                    <button
                      onClick={() => { cameraInputRef.current?.click(); setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                    >
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
                  {user.is_verified && <span className="flex items-center gap-1 text-xs text-[#FF6B00]"><Shield className="w-3 h-3" /> Verified</span>}
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
            <Label className="text-sm text-[#A0A0A0] mb-2 block">Bio</Label>
            {isEditing ? (
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." className="bg-[#0F1115] border-white/10 text-white rounded-xl min-h-[80px]" />
            ) : (
              <p className="text-sm text-[#A0A0A0]">{user.bio || 'No bio yet.'}</p>
            )}
          </div>

          <div>
            <Label className="text-sm text-[#A0A0A0] mb-2 block">Phone</Label>
            {isEditing ? (
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#0F1115] border-white/10 text-white h-9 rounded-xl" />
            ) : (
              <p className="text-sm text-[#A0A0A0]">{user.phone || 'Not set'}</p>
            )}
          </div>
        </motion.div>

        {/* Menu */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden mb-6">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={item.action}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
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
          onClick={async () => { await signOut(); navigate('/'); toast.success('Logged out'); }}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-12"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </div>
  );
}
