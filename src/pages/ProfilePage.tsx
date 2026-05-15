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
import { Camera, Edit, Check, Shield, Star, Car, Calendar, ChevronRight, Loader2, LogOut } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast.success('Avatar uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    const updates = { name, bio, phone, avatar: avatarUrl };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      // Update local state
      setUser({ ...user, ...updates });
      toast.success('Profile saved!');
      setIsEditing(false);
    }

    setIsSaving(false);
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={handleAvatarClick}>
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
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
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
