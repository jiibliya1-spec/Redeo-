import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet } from '@/lib/supabase';
import { uploadVerificationDoc } from '@/services/storageService';
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
  const { user } = useStore();
  const { t, dir } = useI18n();

  // Separate refs for gallery vs camera
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [activeDoc, setActiveDoc] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [steps, setSteps] = useState<VStep[]>([
    { id: 'cin', title: t('verify.cin'), desc: t('verify.cin_desc'), icon: CreditCard, status: 'pending' },
    { id: 'selfie', title: t('verify.selfie'), desc: t('verify.selfie_desc'), icon: Camera, status: 'pending' },
    { id: 'license', title: t('verify.license'), desc: t('verify.license_desc'), icon: FileText, status: 'pending' },
    { id: 'registration', title: t('verify.registration'), desc: t('verify.registration_desc'), icon: FileText, status: 'pending' },
    { id: 'insurance', title: t('verify.insurance'), desc: t('verify.insurance_desc'), icon: Shield, status: 'pending' },
  ]);

  // Load verifications from Supabase ONLY
  const loadVerifications = async () => {
    if (!user?.id) return;
    try {
      const data = await apiGet('verifications', { eq: { user_id: user.id } });
      if (data && data.length > 0) {
        setSteps(prev =>
          prev.map(s => {
            const found = data.find((d: any) => d.doc_type === s.id);
            return found ? { ...s, status: found.status, url: found.url } : s;
          })
        );
      }
    } catch { /* silent - table may not exist */ }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadVerifications();
  }, [user?.id]);

  // Convert file to base64 data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── SAVE TO SUPABASE ONLY (no localStorage) ───
  const saveDocToSupabase = async (userId: string, docType: DocType, url: string) => {
    // Try insert first (upsert)
    try {
      // Use REST API for reliability
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://qhbiafoyhvmvyyzwdzhd.supabase.co'}/rest/v1/verifications`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjA0NywiZXhwIjoyMDk0MzY4MDQ3fQ.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM'}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          doc_type: docType,
          status: 'uploaded',
          url,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      console.log('DB save warning:', err.message);
      throw err;
    }
  };

  // Process uploaded file - saves to SUPABASE only
  const processFile = async (file: File) => {
    if (!user?.id || !activeDoc) return;

    setIsUploading(true);

    try {
      // 1. Convert to base64
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);

      let savedUrl = dataUrl;

      // 2. Try Supabase Storage first (works if RLS configured)
      try {
        const storageUrl = await uploadVerificationDoc(user.id, activeDoc, file);
        savedUrl = storageUrl;
        console.log('Storage upload OK:', storageUrl);
      } catch (storageErr: any) {
        console.log('Storage blocked (RLS), using database base64:', storageErr.message);
      }

      // 3. Always save to Supabase Database (works 100% if table exists)
      try {
        await saveDocToSupabase(user.id, activeDoc, savedUrl);
        toast.success(t('verify.upload_success') || 'Document uploaded!');
      } catch (dbErr: any) {
        toast.error('Database error: ' + dbErr.message);
        return;
      }

      // 4. Update UI
      setSteps(prev =>
        prev.map(s => s.id === activeDoc ? { ...s, status: 'uploaded' as const, url: savedUrl } : s)
      );

      // 5. Refresh from Supabase to confirm
      setTimeout(() => loadVerifications(), 500);

    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      setActiveDoc(null);
    }
  };

  // Handle file from gallery
  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input
    await processFile(file);
  };

  // Handle file from camera
  const handleCameraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input
    await processFile(file);
  };

  // Open gallery file picker
  const openGallery = (docType: DocType) => {
    setActiveDoc(docType);
    // Small delay to ensure state is set before click
    setTimeout(() => {
      galleryInputRef.current?.click();
    }, 50);
  };

  // Open camera
  const openCamera = (docType: DocType) => {
    setActiveDoc(docType);
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 50);
  };

  const completed = steps.filter(s => s.status !== 'pending').length;
  const progress = (completed / steps.length) * 100;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">{t('verify.title')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      {/* TWO SEPARATE HIDDEN INPUTS: Gallery vs Camera */}
      {/* Gallery/File input - NO capture attribute */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleGalleryFile}
      />
      {/* Camera input - WITH capture="environment" */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraFile}
      />

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1B1F27] rounded-2xl border border-white/10 p-4 max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white font-medium">Uploading...</p>
              <button onClick={() => setPreviewUrl(null)} className="p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            </div>
            <img src={previewUrl} alt="Preview" className="w-full rounded-xl" />
            <div className="mt-3 flex items-center gap-2 text-[#A0A0A0]">
              <Loader2 className="w-4 h-4 animate-spin text-[#FF6B00]" />
              <span className="text-xs">{t('common.loading')}</span>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold text-white" dir={dir}>{t('verify.title')}</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">{t('verify.subtitle')}</p>
        </motion.div>

        {/* Progress */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#A0A0A0]">{t('verify.progress')}</span>
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
              <p className="text-sm text-green-400 font-semibold">{t('verify.verified')}</p>
              <p className="text-xs text-[#A0A0A0]">{t('verify.verified_desc')}</p>
            </div>
          </div>
        ) : completed > 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">{t('verify.partial')}</p>
              <p className="text-xs text-[#A0A0A0]">{steps.length - completed} {t('verify.remaining_docs')}</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm text-yellow-400 font-semibold">{t('verify.required')}</p>
              <p className="text-xs text-[#A0A0A0]">{t('verify.upload_docs')}</p>
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      step.status === 'verified' ? 'bg-green-500/10 text-green-400' :
                      step.status === 'uploaded' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-white/5 text-[#A0A0A0]'
                    }`}>{step.status}</span>
                  </div>
                  <p className="text-xs text-[#A0A0A0] mb-3">{step.desc}</p>

                  {/* Preview if uploaded */}
                  {step.url && (
                    <div className="mb-3">
                      <img
                        src={step.url}
                        alt={step.title}
                        className="w-full max-h-40 object-cover rounded-xl border border-white/5"
                        onClick={() => window.open(step.url, '_blank')}
                      />
                    </div>
                  )}

                  {step.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openGallery(step.id)}
                        disabled={isUploading}
                        variant="outline"
                        className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl h-8 text-xs"
                      >
                        {isUploading && activeDoc === step.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1" />
                        )}
                        {t('verify.upload_file')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openCamera(step.id)}
                        disabled={isUploading}
                        variant="outline"
                        className="border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-8 text-xs"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        {t('verify.camera')}
                      </Button>
                    </div>
                  )}

                  {step.status === 'uploaded' && (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-yellow-400">{t('verify.under_review')}</p>
                      <button
                        onClick={() => openGallery(step.id)}
                        className="text-xs text-[#FF6B00] hover:underline"
                      >
                        {t('verify.reupload')}
                      </button>
                    </div>
                  )}

                  {step.status === 'verified' && step.url && (
                    <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">
                      {t('common.view')}
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
