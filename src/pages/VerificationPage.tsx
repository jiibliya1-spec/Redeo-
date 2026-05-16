import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Check, Upload, CreditCard, Camera, FileText, AlertCircle, Loader2, X } from 'lucide-react';

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
  const { user, setUser } = useStore();
  const { t, dir } = useI18n();

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [activeDoc, setActiveDoc] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  const [steps, setSteps] = useState<VStep[]>([
    { id: 'cin', title: t('verify.cin') || 'National ID (CIN)', desc: t('verify.cin_desc') || 'Upload your CIN card (front & back)', icon: CreditCard, status: 'pending' },
    { id: 'selfie', title: t('verify.selfie') || 'Selfie Photo', desc: t('verify.selfie_desc') || 'Take a selfie holding your CIN', icon: Camera, status: 'pending' },
    { id: 'license', title: t('verify.license') || 'Driver License', desc: t('verify.license_desc') || 'Upload your driver license', icon: FileText, status: 'pending' },
    { id: 'registration', title: t('verify.registration') || 'Vehicle Registration', desc: t('verify.registration_desc') || 'Upload vehicle registration doc', icon: FileText, status: 'pending' },
    { id: 'insurance', title: t('verify.insurance') || 'Insurance', desc: t('verify.insurance_desc') || 'Upload vehicle insurance', icon: Shield, status: 'pending' },
  ]);

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Load from Supabase
  const loadVerifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/verifications?select=*&user_id=eq.${user.id}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data && data.length > 0) {
        setSteps(prev =>
          prev.map(s => {
            const found = data.find((d: any) => d.doc_type === s.id);
            return found ? { ...s, status: found.status, url: found.url } : s;
          })
        );
      }
    } catch (err: any) {
      console.log('[Verification] Load error:', err.message);
    }
  }, [user?.id, getHeaders]);

  useEffect(() => {
    if (user?.id) loadVerifications();
  }, [user?.id, loadVerifications]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Save doc using REST API with JWT
  const saveDoc = async (userId: string, docType: DocType, url: string): Promise<boolean> => {
    const headers = await getHeaders();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

    try {
      // Check if exists
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/verifications?select=id&user_id=eq.${userId}&doc_type=eq.${docType}&limit=1`,
        { headers }
      );
      const rows = checkRes.ok ? await checkRes.json() : [];
      const exists = rows && rows.length > 0;

      if (exists) {
        // UPDATE
        const res = await fetch(
          `${supabaseUrl}/rest/v1/verifications?user_id=eq.${userId}&doc_type=eq.${docType}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              status: 'uploaded',
              url,
              updated_at: new Date().toISOString(),
            }),
          }
        );
        return res.ok;
      } else {
        // INSERT
        const res = await fetch(`${supabaseUrl}/rest/v1/verifications`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            user_id: userId,
            doc_type: docType,
            status: 'uploaded',
            url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        return res.ok;
      }
    } catch {
      return false;
    }
  };

  const processFile = async (file: File) => {
    if (!user?.id || !activeDoc) return;
    setIsUploading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);

      // Save to Supabase
      const ok = await saveDoc(user.id, activeDoc, dataUrl);
      if (!ok) {
        toast.error('Failed to save document. Please try again.');
        setIsUploading(false);
        return;
      }

      setSteps(prev =>
        prev.map(s => s.id === activeDoc ? { ...s, status: 'uploaded' as const, url: dataUrl } : s)
      );
      toast.success(`${activeDoc.toUpperCase()} uploaded successfully!`);

      // Refresh from Supabase
      await loadVerifications();

    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      setActiveDoc(null);
    }
  };

  // Submit all docs for review
  const handleSubmitForReview = async () => {
    if (!user?.id) return;
    const uploaded = steps.filter(s => s.status === 'uploaded');
    if (uploaded.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setSubmittingAll(true);
    try {
      const headers = await getHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

      // Update all uploaded docs to 'pending' status
      for (const doc of uploaded) {
        await fetch(
          `${supabaseUrl}/rest/v1/verifications?user_id=eq.${user.id}&doc_type=eq.${doc.id}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending' }),
          }
        );
      }

      // Update user profile verification status
      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verification_status: 'submitted',
            is_verified: false,
          }),
        }
      );

      // Update local state
      setSteps(prev => prev.map(s => s.status === 'uploaded' ? { ...s, status: 'pending' as const } : s));

      // Update user in store
      if (user) {
        setUser({ ...user, verification_status: 'submitted', is_verified: false });
      }

      toast.success('Documents submitted for review! Admin will verify them soon.');
    } catch (err: any) {
      toast.error('Submit failed: ' + err.message);
    }
    setSubmittingAll(false);
  };

  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processFile(file);
  };

  const handleCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processFile(file);
  };

  const openGallery = (docType: DocType) => {
    setActiveDoc(docType);
    setTimeout(() => galleryInputRef.current?.click(), 50);
  };

  const openCamera = (docType: DocType) => {
    setActiveDoc(docType);
    setTimeout(() => cameraInputRef.current?.click(), 50);
  };

  const completed = steps.filter(s => s.status !== 'pending').length;
  const allUploaded = completed === steps.length && completed > 0;
  const progress = (completed / steps.length) * 100;

  // Debug logging
  console.log('[Verification] completed:', completed, 'allUploaded:', allUploaded, 'is_verified:', user?.is_verified);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">{t('auth.login')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraFile} />

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1B1F27] rounded-2xl border border-white/10 p-4 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white font-medium">Uploading...</p>
              <button onClick={() => { setPreviewUrl(null); setIsUploading(false); }} className="p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            </div>
            <img src={previewUrl} alt="Preview" className="w-full rounded-xl" />
            <div className="mt-3 flex items-center gap-2 text-[#A0A0A0]">
              <Loader2 className="w-4 h-4 animate-spin text-[#FF6B00]" />
              <span className="text-xs">Saving to server...</span>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold text-white" dir={dir}>{t('verify.title') || 'Driver Verification'}</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">{t('verify.subtitle') || 'Submit your documents to get verified'}</p>
        </motion.div>

        {/* Progress */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#A0A0A0]">{t('verify.progress') || 'Progress'}</span>
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
              <p className="text-sm text-green-400 font-semibold">{t('verify.verified') || 'Verified'}</p>
              <p className="text-xs text-[#A0A0A0]">{t('verify.verified_desc') || 'Your documents have been approved'}</p>
            </div>
          </div>
        ) : completed > 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">{t('verify.partial') || 'Documents Uploaded'}</p>
              <p className="text-xs text-[#A0A0A0]">{steps.length - completed} {t('verify.remaining_docs') || 'documents remaining'}</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">{t('verify.required') || 'Verification Required'}</p>
              <p className="text-xs text-[#A0A0A0]">{t('verify.upload_docs') || 'Please upload all required documents'}</p>
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
                  step.status === 'uploaded' || step.status === 'pending' ? 'bg-yellow-500/10' :
                  'bg-[#FF6B00]/10'
                }`}>
                  {step.status === 'verified' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <step.icon className={`w-5 h-5 ${step.status === 'pending' || step.status === 'uploaded' ? 'text-yellow-400' : 'text-[#FF6B00]'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      step.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                      step.status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
                      step.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-white/5 text-[#A0A0A0]'
                    }`}>{step.status}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] mb-3">{step.desc}</p>

                  {step.url && (
                    <div className="mb-3">
                      <img src={step.url} alt={step.title} className="w-full max-h-40 object-cover rounded-xl border border-white/5" onClick={() => window.open(step.url, '_blank')} />
                    </div>
                  )}

                  {step.status === 'pending' && (
                    <p className="text-xs text-blue-400">Under review by admin</p>
                  )}

                  {(step.status === 'pending' || step.status === 'verified') ? null : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openGallery(step.id)} disabled={isUploading} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl h-8 text-xs">
                        <Upload className="w-3.5 h-3.5 mr-1" /> {t('verify.upload_file') || 'Upload'}
                      </Button>
                      <Button size="sm" onClick={() => openCamera(step.id)} disabled={isUploading} variant="outline" className="border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-8 text-xs">
                        <Camera className="w-3.5 h-3.5 mr-1" /> {t('verify.camera') || 'Camera'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit for Review Button */}
        {allUploaded === true && user?.is_verified !== true && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <Button
              onClick={handleSubmitForReview}
              disabled={submittingAll}
              className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-12 text-base font-semibold shadow-lg shadow-[#FF6B00]/20"
            >
              {submittingAll ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Shield className="w-5 h-5 mr-2" />}
              {t('verify.submit_review') || 'Submit for Review'}
            </Button>
            <p className="text-xs text-[#A0A0A0] text-center mt-2">Admin will review your documents and approve or reject</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
