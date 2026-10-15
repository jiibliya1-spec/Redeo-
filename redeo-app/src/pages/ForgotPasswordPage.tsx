import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authErrorKey } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    // Unknown emails get the same screen (no account enumeration); only real failures show an error.
    if (error && authErrorKey(error.message) !== 'err.generic') {
      toast.error(t(authErrorKey(error.message)));
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 pt-16">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Logo className="w-10 h-10" />
            <span className="text-2xl font-semibold text-white">Re<span className="text-[#FF6B00]">deo</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">{sent ? t('fp.sent_title') : t('fp.title')}</h1>
          {!sent && <p className="text-sm text-[#A0A0A0] mt-1">{t('fp.subtitle')}</p>}
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <MailCheck className="w-14 h-14 text-[#FF6B00] mx-auto" />
            <p className="text-sm text-[#A0A0A0]">{t('fp.sent_msg', { email: email.trim() })}</p>
            <Link to="/login" className="inline-block text-[#FF6B00] hover:underline font-medium text-sm">{t('fp.back_login')}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.email')}</Label>
              <Input type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.ma" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 text-base font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('fp.send')}
            </Button>
            <p className="text-center text-sm"><Link to="/login" className="text-[#A0A0A0] hover:text-white">{t('fp.back_login')}</Link></p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
