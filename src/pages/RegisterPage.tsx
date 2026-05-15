import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Car, Eye, EyeOff, Loader2 } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useStore();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
      toast.success('Account created! Welcome to WansniAuto.');
      if (role === 'driver') navigate('/driver');
      else navigate('/dashboard');
    } else {
      toast.error(result.error || 'Registration failed');
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
          <h1 className="text-2xl font-bold text-white">{step === 1 ? 'Create account' : 'Almost there'}</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">{step === 1 ? 'Join WansniAuto today' : 'Review and confirm'}</p>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2].map(i => <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-[#FF6B00]' : 'bg-white/10'}`} />)}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-2">
                {(['passenger', 'driver'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`p-4 rounded-xl border text-center transition-all ${role === r ? 'border-[#FF6B00]/50 bg-[#FF6B00]/5' : 'border-white/5 hover:border-white/10'}`}>
                    <Car className={`w-6 h-6 mx-auto mb-2 ${role === r ? 'text-[#FF6B00]' : 'text-[#A0A0A0]'}`} />
                    <p className="text-sm text-white font-medium capitalize">{r}</p>
                  </button>
                ))}
              </div>
              <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Full name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required /></div>
              <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.ma" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required /></div>
              <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Phone</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl" required /></div>
              <div><Label className="text-sm text-[#A0A0A0] mb-2 block">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="bg-[#1B1F27] border-white/10 text-white placeholder:text-[#A0A0A0]/40 h-12 rounded-xl pr-10" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0]">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-[#1B1F27] rounded-xl p-4 border border-[#FF6B00]/20 mb-4">
                <p className="text-sm text-white font-medium">{name}</p>
                <p className="text-xs text-[#A0A0A0]">{email} &middot; {phone}</p>
                <p className="text-xs text-[#FF6B00] mt-1 capitalize">Registering as: {role}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-white/5 hover:border-white/10">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 rounded border-white/20" />
                <span className="text-sm text-[#A0A0A0]">I agree to the <span className="text-[#FF6B00]">Terms</span> and <span className="text-[#FF6B00]">Privacy Policy</span>. I confirm I am at least 18 years old.</span>
              </label>
            </>
          )}

          <Button type="submit" disabled={isLoading || (step === 2 && !agreed)} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 font-semibold disabled:opacity-50 mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 1 ? 'Continue' : 'Create Account'}
          </Button>
          {step === 2 && <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-12">Back</Button>}
        </form>

        <p className="text-center text-sm text-[#A0A0A0] mt-6">Already have an account? <Link to="/login" className="text-[#FF6B00] hover:underline font-medium">Sign in</Link></p>
      </motion.div>
    </div>
  );
}
