import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Car, Eye, EyeOff, Loader2, Mail, RefreshCw, CheckCircle2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useStore();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
        toast.error('Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters.');
        return;
      }
      setStep(2);
      return;
    }

    if (!agreed) {
      toast.error('Please agree to the terms.');
      return;
    }

    setIsLoading(true);
    const result = await signUp(email, password, name, phone, role);

    if (result.success) {
      if (result.needsConfirmation) {
        // Email confirmation required — show confirmation screen
        setStep(3);
      } else {
        // Auto-confirmed — go to dashboard directly
        toast.success('Account created! Welcome to WansniAuto.');
        if (role === 'driver') navigate('/driver');
        else navigate('/dashboard');
      }
    } else {
      toast.error(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin + '/dashboard' },
    });
    if (error) {
      toast.error('Failed to resend: ' + error.message);
    } else {
      toast.success('Confirmation email resent!');
    }
    setResending(false);
  };

  const stepLabels = ['Info', 'Confirm', 'Email'];

  return (
    <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-4 pt-16 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">
              Wansni<span className="text-[#FF6B00]">Auto</span>
            </span>
          </Link>
          {step < 3 && (
            <>
              <h1 className="text-2xl font-bold text-white">
                {step === 1 ? t('auth.create_account') : 'Almost there'}
              </h1>
              <p className="text-sm text-[#A0A0A0] mt-1">
                {step === 1 ? t('auth.no_account') : 'Review and confirm'}
              </p>
            </>
          )}
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-8">
            {stepLabels.slice(0, 2).map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-1.5 ${active ? 'text-[#FF6B00]' : done ? 'text-green-400' : 'text-[#A0A0A0]'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${active ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : done ? 'border-green-400 bg-green-400/10' : 'border-white/10'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className="text-xs hidden sm:block">{label}</span>
                  </div>
                  {n < 2 && <div className={`flex-1 h-[2px] rounded-full ${done ? 'bg-green-400' : step > n ? 'bg-[#FF6B00]' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Step 3: Check your email ── */}
          {step === 3 && (
            <motion.div
              key="email-confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
                className="w-24 h-24 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF6B00]/20"
              >
                <Mail className="w-12 h-12 text-[#FF6B00]" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-[#A0A0A0] text-sm mb-1">We sent a confirmation link to:</p>
              <p className="text-white font-semibold mb-6 text-base">{email}</p>

              <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6 text-left space-y-3">
                {[
                  { n: '1', text: 'Open your email inbox' },
                  { n: '2', text: 'Click the confirmation link from WansniAuto' },
                  { n: '3', text: 'You\'ll be redirected and logged in automatically' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FF6B00]/10 text-[#FF6B00] rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {step.n}
                    </div>
                    <p className="text-sm text-[#A0A0A0]">{step.text}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleResend}
                disabled={resending}
                variant="outline"
                className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-12 mb-3"
              >
                {resending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                  : <><RefreshCw className="w-4 h-4 mr-2" />Resend confirmation email</>
                }
              </Button>

              <p className="text-xs text-[#A0A0A0]">
                Wrong email?{' '}
                <button
                  onClick={() => { setStep(1); setEmail(''); setPassword(''); }}
                  className="text-[#FF6B00] hover:underline"
                >
                  Go back and edit
                </button>
              </p>

              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-sm text-[#A0A0A0]">
                  Already confirmed?{' '}
                  <Link to="/login" className="text-[#FF6B00] hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Steps 1 & 2 ── */}
          {step < 3 && (
            <motion.form
              key={`step-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  {/* Role picker */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {([
                      { value: 'passenger', label: t('auth.passenger'), icon: Users },
                      { value: 'driver', label: t('auth.driver'), icon: Car },
                    ] as const).map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          role === r.value
                            ? 'border-[#FF6B00]/50 bg-[#FF6B00]/5'
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <r.icon className={`w-6 h-6 mx-auto mb-2 ${role === r.value ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`} />
                        <p className="text-sm text-white font-medium">{r.label}</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.name')}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.email')}</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.ma" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.phone')}</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-2 block">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl pr-10"
                        required minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="bg-[#1B1F27] rounded-xl p-4 border border-[#FF6B00]/20 mb-4">
                    <p className="text-sm text-white font-medium">{name}</p>
                    <p className="text-xs text-[#A0A0A0]">{email} · {phone}</p>
                    <p className="text-xs text-[#FF6B00] mt-1 capitalize">
                      {t('auth.role')}: {role === 'passenger' ? t('auth.passenger') : t('auth.driver')}
                    </p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/5 hover:border-white/10">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-white/20"
                    />
                    <span className="text-sm text-[#A0A0A0]">
                      I agree to the <span className="text-[#FF6B00]">Terms</span> and{' '}
                      <span className="text-[#FF6B00]">Privacy Policy</span>. I confirm I am at least 18 years old.
                    </span>
                  </label>
                </>
              )}

              <Button
                type="submit"
                disabled={isLoading || (step === 2 && !agreed)}
                className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 font-semibold disabled:opacity-50 mt-2"
              >
                {isLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : step === 1 ? 'Continue' : t('auth.register_btn')
                }
              </Button>

              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-12"
                >
                  Back
                </Button>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {step < 3 && (
          <p className="text-center text-sm text-[#A0A0A0] mt-6">
            {t('auth.has_account')}{' '}
            <Link to="/login" className="text-[#FF6B00] hover:underline font-medium">
              {t('auth.login_now')}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
