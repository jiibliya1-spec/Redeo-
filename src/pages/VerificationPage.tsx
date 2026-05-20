import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Upload, CheckCircle, Clock, XCircle,
  User, CreditCard, Car, Shield, Eye, Trash2
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/* ─── Single bucket 'documents' with subfolders per doc type ─── */
const BUCKET = 'documents';

interface DocStep {
  id: string;
  label: string;
  labelAr: string;
  labelFr: string;
  desc: string;
  descAr: string;
  descFr: string;
  icon: any;
  status: 'not_uploaded' | 'uploading' | 'uploaded' | 'pending' | 'approved' | 'rejected';
  url?: string;
  filePath?: string;
  rejectionReason?: string;
  errorMsg?: string;
}

const ALL_DOCS: DocStep[] = [
  { id: 'cin_front', label: 'National ID (Front)', labelAr: 'البطاقة الوطنية (أمام)', labelFr: 'CIN (Recto)', desc: 'Clear photo of your National ID front side', descAr: 'صورة واضحة للبطاقة الوطنية من الأمام', descFr: 'Photo claire du recto de votre CIN', icon: CreditCard, status: 'not_uploaded' },
  { id: 'cin_back', label: 'National ID (Back)', labelAr: 'البطاقة الوطنية (خلف)', labelFr: 'CIN (Verso)', desc: 'Clear photo of your National ID back side', descAr: 'صورة واضحة للبطاقة الوطنية من الخلف', descFr: 'Photo claire du verso de votre CIN', icon: CreditCard, status: 'not_uploaded' },
  { id: 'selfie', label: 'Selfie with ID', labelAr: 'صورة شخصية مع البطاقة', labelFr: 'Selfie avec CIN', desc: 'Photo of yourself holding your ID next to your face', descAr: 'صورة شخصية وانت كاتمسك البطاقة بجانب وجهك', descFr: 'Photo de vous tenant votre CIN', icon: User, status: 'not_uploaded' },
  { id: 'driver_license', label: 'Driver License', labelAr: 'رخصة السياقة', labelFr: 'Permis de conduire', desc: 'Clear photo of your valid driver license', descAr: 'صورة واضحة لرخصة السياقة الصالحة', descFr: 'Photo claire de votre permis', icon: Shield, status: 'not_uploaded' },
  { id: 'insurance', label: 'Insurance Certificate', labelAr: 'وثيقة التأمين', labelFr: 'Attestation d\'assurance', desc: 'Vehicle insurance certificate', descAr: 'شهادة التأمين للسيارة', descFr: 'Attestation d\'assurance', icon: Shield, status: 'not_uploaded' },
  { id: 'car_photo_front', label: 'Car Photo (Front)', labelAr: 'صورة السيارة (أمام)', labelFr: 'Photo voiture (Avant)', desc: 'Front view of your vehicle', descAr: 'صورة السيارة من القدام', descFr: 'Vue de face de votre véhicule', icon: Car, status: 'not_uploaded' },
  { id: 'car_photo_back', label: 'Car Photo (Back)', labelAr: 'صورة السيارة (خلف)', labelFr: 'Photo voiture (Arrière)', desc: 'Back view of your vehicle', descAr: 'صورة السيارة من الخلف', descFr: 'Vue de derrière', icon: Car, status: 'not_uploaded' },
];

export default function VerificationPage() {
  const { user, setUser } = useStore();
  const { t, lang } = useI18n();
  const [steps, setSteps] = useState<DocStep[]>([...ALL_DOCS]);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  /* ─── Load existing docs ─── */
  const loadDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: docs, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('user_id', user.id);

      if (error) { console.warn('[Verify] load error:', error.message); return; }
      if (!docs?.length) return;

      setSteps((prev) => prev.map((s) => {
        const d = docs.find((doc: any) => doc.doc_type === s.id);
        return d ? { ...s, status: d.status, url: d.public_url, filePath: d.storage_path, rejectionReason: d.rejection_reason } : s;
      }));

      const rejected = docs.find((d: any) => d.rejection_reason);
      if (rejected) setRejectionReason(rejected.rejection_reason);
    } catch (e) { console.warn('[Verify] load docs error', e); }
  }, [user?.id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  /* ─── Realtime ─── */
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const ch = supabase
      .channel(`vd-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verifications', filter: `user_id=eq.${uid}` }, () => loadDocuments())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, (payload) => {
        const p = payload.new as any;
        setUser({ ...user, is_verified: p.is_verified === true, verification_status: p.verification_status });
        if (p.is_verified) toast.success(t('verify.approved_toast'));
        else if (p.verification_status === 'rejected') toast.error(t('verify.rejected_toast'));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  /* ─── Upload ─── */
  const handleUpload = async (docId: string, file: File) => {
    /* 1. Check session */
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      toast.error('Please login first');
      return;
    }
    if (!user?.id) { toast.error('User not authenticated'); return; }

    /* 2. Use single 'documents' bucket with subfolder */
    const bucket = BUCKET;

    /* 3. Set uploading state */
    setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'uploading' as const, errorMsg: undefined } : s));

    try {
      const uid = user.id;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${docId}_${Date.now()}.${ext}`;
      const filePath = `${uid}/${docId}/${fileName}`;

      console.log('[Upload] ============================================');
      console.log('[Upload] docId:', docId);
      console.log('[Upload] bucket:', bucket);
      console.log('[Upload] filePath:', filePath);
      console.log('[Upload] file.name:', file.name);
      console.log('[Upload] file.type:', file.type);
      console.log('[Upload] file.size:', file.size);
      console.log('[Upload] user.id:', uid);

      /* 4. Upload to correct bucket */
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        console.error('[Upload] Storage ERROR:', uploadError.name, uploadError.message);
        throw new Error(`Storage: ${uploadError.message}`);
      }

      console.log('[Upload] Storage OK:', uploadData?.path);

      /* 5. Get public URL */
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      console.log('[Upload] Public URL:', publicUrl);

      /* 6. Save to DB */
      const { error: dbError } = await supabase
        .from('verifications')
        .upsert({
          user_id: uid,
          doc_type: docId,
          status: 'pending',
          storage_path: filePath,
          public_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,doc_type' });

      if (dbError) {
        console.error('[Upload] DB ERROR:', dbError.message);
        throw new Error(`Database: ${dbError.message}`);
      }

      console.log('[Upload] DB saved OK for:', docId);

      /* 7. Update UI */
      setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'uploaded' as const, url: publicUrl, filePath } : s));
      toast.success(t('verify.upload_success'));
    } catch (err: any) {
      console.error('[Upload] FAILED:', err.message);
      setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'not_uploaded' as const, errorMsg: err.message } : s));
      toast.error(`${t('verify.upload_error')}: ${err.message}`);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (docId: string) => {
    if (!user?.id) return;
    const step = steps.find((s) => s.id === docId);
    if (!step?.filePath) return;
    try {
      await supabase.storage.from(BUCKET).remove([step.filePath]);
      await supabase.from('verifications').delete().eq('user_id', user.id).eq('doc_type', docId);
      setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'not_uploaded' as const, url: undefined, filePath: undefined } : s));
      toast.success('Document removed');
    } catch (e: any) { toast.error('Failed: ' + e.message); }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!user?.id) return;
    const uploaded = steps.filter((s) => s.status === 'uploaded');
    if (uploaded.length === 0) { toast.error(t('verify.no_docs')); return; }

    setSubmitting(true);
    try {
      for (const doc of uploaded) {
        await supabase.from('verifications').update({ status: 'pending' }).eq('user_id', user.id).eq('doc_type', doc.id);
      }
      await supabase.from('profiles').update({ verification_status: 'submitted', is_verified: false }).eq('id', user.id);
      setSteps((prev) => prev.map((s) => s.status === 'uploaded' ? { ...s, status: 'pending' as const } : s));
      setUser({ ...user, verification_status: 'submitted', is_verified: false });
      toast.success(t('verify.submitted'));
    } catch { toast.error(t('verify.submit_error')); }
    setSubmitting(false);
  };

  /* ─── Helpers ─── */
  const getStatus = (s: DocStep['status']) => {
    switch (s) {
      case 'approved': return { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: lang === 'ar' ? 'مقبول' : lang === 'fr' ? 'Approuvé' : 'Approved', color: 'text-green-500' };
      case 'pending': return { icon: <Clock className="w-5 h-5 text-yellow-500" />, label: lang === 'ar' ? 'قيد المراجعة' : lang === 'fr' ? 'En attente' : 'Pending', color: 'text-yellow-500' };
      case 'uploaded': return { icon: <CheckCircle className="w-5 h-5 text-blue-500" />, label: lang === 'ar' ? 'تم التحميل' : lang === 'fr' ? 'Téléchargé' : 'Uploaded', color: 'text-blue-500' };
      case 'uploading': return { icon: <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />, label: lang === 'ar' ? 'جاري...' : lang === 'fr' ? 'Chargement...' : 'Uploading...', color: 'text-[#FF6B00]' };
      case 'rejected': return { icon: <XCircle className="w-5 h-5 text-red-500" />, label: lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Rejeté' : 'Rejected', color: 'text-red-500' };
      default: return { icon: <div className="w-5 h-5 rounded-full border-2 border-white/20" />, label: lang === 'ar' ? 'لم يُحمّل' : lang === 'fr' ? 'Non téléchargé' : 'Not Uploaded', color: 'text-[#A0A0A0]' };
    }
  };

  const getLabel = (step: DocStep) => lang === 'ar' ? step.labelAr : lang === 'fr' ? step.labelFr : step.label;
  const getDesc = (step: DocStep) => lang === 'ar' ? step.descAr : lang === 'fr' ? step.descFr : step.desc;

  const uploadedCount = steps.filter((s) => ['uploaded','pending','approved'].includes(s.status)).length;
  const allUploaded = uploadedCount === steps.length;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-16 pb-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="p-2 rounded-xl hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></Link>
          <h1 className="text-lg font-semibold text-white">{t('verify.title')}</h1>
        </div>

        {/* Status */}
        {user?.verification_status === 'verified' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div><p className="text-sm font-medium text-green-400">{t('profile.verified')}</p><p className="text-xs text-[#A0A0A0]">{t('verify.approved_toast')}</p></div>
          </motion.div>
        )}
        {user?.verification_status === 'submitted' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-500 shrink-0" />
            <div><p className="text-sm font-medium text-yellow-400">{t('profile.pending')}</p></div>
          </motion.div>
        )}
        {user?.verification_status === 'rejected' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3"><XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div><p className="text-sm font-medium text-red-400">{t('profile.rejected')}</p><p className="text-xs text-[#A0A0A0]">{rejectionReason}</p></div>
            </div>
          </motion.div>
        )}

        {/* Progress */}
        <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#A0A0A0]">{uploadedCount}/{steps.length} docs</span>
            <span className="text-sm font-medium text-[#FF6B00]">{Math.round((uploadedCount/steps.length)*100)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full transition-all" style={{ width: `${(uploadedCount/steps.length)*100}%` }} />
          </div>
        </div>

        {/* Document cards */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const st = getStatus(step.status);
            return (
              <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><step.icon className="w-5 h-5 text-[#FF6B00]" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{getLabel(step)}</p>
                        <div className="flex items-center gap-1.5">{st.icon}<span className={`text-xs ${st.color}`}>{st.label}</span></div>
                      </div>
                      <p className="text-xs text-[#A0A0A0] mt-0.5">{getDesc(step)}</p>
                      {step.errorMsg && (
                        <p className="text-xs text-red-400 mt-1">Error: {step.errorMsg}</p>
                      )}

                      {/* Preview */}
                      {step.url && (
                        <div className="mt-3 relative">
                          <img src={step.url} alt={step.label} className="w-full h-32 object-cover rounded-lg" onError={() => console.log('[Preview] Failed to load:', step.url)} />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button onClick={() => setPreviewUrl(step.url || null)} className="w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center hover:bg-black/80"><Eye className="w-4 h-4 text-white" /></button>
                            {step.status !== 'approved' && step.status !== 'pending' && (
                              <button onClick={() => handleDelete(step.id)} className="w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center hover:bg-red-500/80"><Trash2 className="w-4 h-4 text-white" /></button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Upload */}
                      {(step.status === 'not_uploaded' || step.status === 'rejected') && (
                        <label className="mt-3 flex items-center gap-2 cursor-pointer">
                          <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(step.id, f); e.target.value = ''; }} />
                          <div className="flex-1 h-10 rounded-lg border border-dashed border-white/10 flex items-center justify-center gap-2 hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 transition-all">
                            <Upload className="w-4 h-4 text-[#A0A0A0]" />
                            <span className="text-xs text-[#A0A0A0]">{lang === 'ar' ? 'اضغط لتحميل الصورة' : lang === 'fr' ? 'Cliquez pour télécharger' : 'Click to upload image'}</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Submit */}
        {user?.verification_status !== 'verified' && user?.verification_status !== 'submitted' && (
          <button onClick={handleSubmit} disabled={!allUploaded || submitting}
            className={`w-full mt-6 py-3 rounded-xl font-medium text-sm transition-all ${allUploaded && !submitting ? 'bg-[#FF6B00] hover:bg-[#E56000] text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}>
            {submitting ? '...' : allUploaded ? t('verify.submitted') : t('verify.no_docs')}
          </button>
        )}

        {/* Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
