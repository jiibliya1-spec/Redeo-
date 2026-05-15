import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { uploadVerificationDoc } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Check, Upload, CreditCard, Camera, FileText, AlertCircle, Loader2 } from 'lucide-react';

type DocType = 'cin' | 'license' | 'selfie' | 'registration' | 'insurance';

interface VStep {
  id: DocType;
  title: string;
  desc: string;
  icon: typeof Shield;
  status: 'pending' | 'uploaded' | 'verified';
  url?: string;
}

export function VerificationPage() {
  const { user } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDoc, setActiveDoc] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [steps, setSteps] = useState<VStep[]>([
    { id: 'cin', title: 'National ID (CIN)', desc: 'Upload front and back of your CIN', icon: CreditCard, status: 'pending' },
    { id: 'selfie', title: 'Selfie Verification', desc: 'Take a selfie for identity match', icon: Camera, status: 'pending' },
    { id: 'license', title: 'Driver License', desc: 'Upload your valid driver license', icon: FileText, status: 'pending' },
    { id: 'registration', title: 'Vehicle Registration', desc: 'Upload car registration documents', icon: FileText, status: 'pending' },
    { id: 'insurance', title: 'Insurance', desc: 'Upload valid insurance certificate', icon: Shield, status: 'pending' },
  ]);

  // Load existing verification docs
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('verifications')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        setSteps(prev =>
          prev.map(s => {
            const found = data.find((d: any) => d.doc_type === s.id);
            return found
              ? { ...s, status: found.status, url: found.url }
              : s;
          })
        );
      });
  }, [user?.id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !activeDoc) return;

    setIsUploading(true);
    try {
      const url = await uploadVerificationDoc(user.id, activeDoc, file);
      setSteps(prev =>
        prev.map(s => s.id === activeDoc ? { ...s, status: 'uploaded' as const, url } : s)
      );
      toast.success(`${activeDoc.toUpperCase()} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setActiveDoc(null);
    }
  };

  const triggerUpload = (docType: DocType) => {
    setActiveDoc(docType);
    fileInputRef.current?.click();
  };

  const openCamera = (docType: DocType) => {
    setActiveDoc(docType);
    fileInputRef.current?.click();
  };

  const completed = steps.filter(s => s.status !== 'pending').length;
  const progress = (completed / steps.length) * 100;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">Please sign in to view verification.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verification Center</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Complete verification to unlock all features</p>
        </motion.div>

        {/* Progress */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#A0A0A0]">Progress</span>
            <span className="text-sm text-[#FF6B00] font-bold">{completed}/{steps.length}</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} className="h-full bg-[#FF6B00] rounded-full" />
          </div>
        </div>

        {/* Status Banner */}
        {user.is_verified ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-green-400 font-semibold">Fully Verified</p>
              <p className="text-xs text-[#A0A0A0]">Your account is fully verified. All features unlocked.</p>
            </div>
          </div>
        ) : completed > 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">Partially Verified</p>
              <p className="text-xs text-[#A0A0A0]">{steps.length - completed} document(s) remaining.</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">Verification Required</p>
              <p className="text-xs text-[#A0A0A0]">Upload documents below to verify your account.</p>
            </div>
          </div>
        )}

        {/* Document Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  step.status === 'verified' ? 'bg-green-500/10' :
                  step.status === 'uploaded' ? 'bg-yellow-500/10' :
                  'bg-[#FF6B00]/10'
                }`}>
                  {step.status === 'verified' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <step.icon className={`w-5 h-5 ${step.status === 'uploaded' ? 'text-yellow-400' : 'text-[#FF6B00]'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      step.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                      step.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-white/5 text-[#A0A0A0]'
                    }`}>{step.status}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] mb-3">{step.desc}</p>

                  {step.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => triggerUpload(step.id)}
                        disabled={isUploading && activeDoc === step.id}
                        variant="outline"
                        className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl h-8 text-xs"
                      >
                        {isUploading && activeDoc === step.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1" />
                        )}
                        Upload File
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openCamera(step.id)}
                        disabled={isUploading && activeDoc === step.id}
                        variant="outline"
                        className="border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-8 text-xs"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        Camera
                      </Button>
                    </div>
                  )}

                  {step.status === 'uploaded' && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-yellow-400">Under review by our team</p>
                      {step.url && (
                        <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF6B00] hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  )}

                  {step.status === 'verified' && step.url && (
                    <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">
                      View document
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
