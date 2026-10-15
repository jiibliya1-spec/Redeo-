import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authErrorKey } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [ready, setReady] = useState<'wait' | 'ok' | 'bad'>('wait');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // The email link carries a recovery token; supabase-js turns it into a session.
  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (alive && (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session))) setReady('ok');
    });
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (alive) setReady((r) => (r === 'ok' ? r : data.session ? 'ok' : 'bad'));
    }, 1500);
    return () => { alive = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error(t('rp.mismatch')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(t(authErrorKey(error.message))); return; }
    toast.success(t('rp.success'));
    // Fresh start: sign out the recovery session and log in with the new password.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 pt-16">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Logo className="w-10 h-10" />
            <span className="text-2xl font-semibold text-white">Re<span className="text-[#FF6B00]">deo</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('rp.title')}</h1>
          {ready === 'ok' && <p className="text-sm text-[#A0A0A0] mt-1">{t('rp.subtitle')}</p>}
        </div>

        {ready === 'wait' && <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" /></div>}

        {ready === 'bad' && (
          <div className="text-center space-y-6">
            <p className="text-sm text-[#A0A0A0]">{t('rp.invalid')}</p>
            <Button onClick={() => navigate('/forgot-password', { replace: true })} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 px-6 font-semibold">{t('rp.new_link')}</Button>
          </div>
        )}

        {ready === 'ok' && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('rp.new')}</Label>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="bg-[#1B1F27] border-white/10 text-white h-12 rounded-xl pr-10" required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('rp.confirm')}</Label>
              <Input type={show ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} className="bg-[#1B1F27] border-white/10 text-white h-12 rounded-xl" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 text-base font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('rp.save')}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
