import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Car, Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, refreshProfile } = useStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Clear ALL cached profile data before login
    try {
      localStorage.removeItem('wansniauto_profile_data');
      localStorage.removeItem('wansniauto-storage');
    } catch { /* silent */ }

    const result = await signIn(email, password);

    if (result.success) {
      toast.success('Welcome back!');
      await refreshProfile();
      const { user: freshUser } = useStore.getState();
      if (freshUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      toast.error(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 pt-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">Wansni<span className="text-[#FF6B00]">Auto</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('auth.welcome_back')}</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">{t('auth.login')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.email')}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.ma" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required />
          </div>
          <div>
            <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.password')}</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 text-base font-semibold disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.login_btn')}
          </Button>
        </form>

        <p className="text-center text-sm text-[#A0A0A0] mt-6">
          {t('auth.no_account')} <Link to="/register" className="text-[#FF6B00] hover:underline font-medium">{t('auth.register_now')}</Link>
        </p>
      </motion.div>
    </div>
  );
}
