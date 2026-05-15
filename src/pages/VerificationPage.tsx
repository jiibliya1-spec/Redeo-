import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Check, Upload, CreditCard, Camera, FileText, AlertCircle } from 'lucide-react';

type DocType = 'cin' | 'license' | 'selfie' | 'registration' | 'insurance';

interface VStep { id: DocType; title: string; desc: string; icon: typeof Shield; status: 'pending' | 'uploaded' | 'verified'; }

export function VerificationPage() {
  const { user } = useStore();
  const [steps, setSteps] = useState<VStep[]>([
    { id: 'cin', title: 'National ID (CIN)', desc: 'Upload front and back of your CIN', icon: CreditCard, status: 'pending' },
    { id: 'selfie', title: 'Selfie Verification', desc: 'Take a selfie for identity match', icon: Camera, status: 'pending' },
    { id: 'license', title: 'Driver License', desc: 'Upload your valid driver license', icon: FileText, status: 'pending' },
    { id: 'registration', title: 'Vehicle Registration', desc: 'Upload car registration documents', icon: FileText, status: 'pending' },
    { id: 'insurance', title: 'Insurance', desc: 'Upload valid insurance certificate', icon: Shield, status: 'pending' },
  ]);

  const handleUpload = (id: DocType) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status: 'uploaded' } : s));
    toast.success('Document uploaded!');
  };

  const completed = steps.filter(s => s.status !== 'pending').length;
  const progress = (completed / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-[#FF6B00]" /></div>
          <h1 className="text-2xl font-bold text-white">Verification Center</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Complete verification to unlock all features</p>
        </motion.div>

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-3"><span className="text-sm text-[#A0A0A0]">Progress</span><span className="text-sm text-[#FF6B00] font-bold">{completed}/{steps.length}</span></div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} className="h-full bg-[#FF6B00] rounded-full" /></div>
        </div>

        {user?.is_verified ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div><p className="text-sm text-green-400 font-semibold">Fully Verified</p><p className="text-xs text-[#A0A0A0]">Your account is fully verified.</p></div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div><p className="text-sm text-yellow-400 font-semibold">Verification Required</p><p className="text-xs text-[#A0A0A0]">Complete the steps below.</p></div>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${step.status === 'verified' ? 'bg-green-500/10' : step.status === 'uploaded' ? 'bg-yellow-500/10' : 'bg-[#FF6B00]/10'}`}>
                  {step.status === 'verified' ? <Check className="w-5 h-5 text-green-400" /> : <step.icon className={`w-5 h-5 ${step.status === 'uploaded' ? 'text-yellow-400' : 'text-[#FF6B00]'}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${step.status === 'verified' ? 'bg-green-500/10 text-green-400' : step.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/5 text-[#A0A0A0]'}`}>{step.status}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] mb-3">{step.desc}</p>
                  {step.status === 'pending' && (
                    <Button size="sm" onClick={() => handleUpload(step.id)} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl h-8 text-xs">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                    </Button>
                  )}
                  {step.status === 'uploaded' && <p className="text-xs text-yellow-400">Under review</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
