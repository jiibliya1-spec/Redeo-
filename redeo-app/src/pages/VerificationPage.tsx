import { useState, useEffect, useCallback, useRef } from 'react';
  import { Link } from 'react-router-dom';
  import { motion, AnimatePresence } from 'framer-motion';
  import {
    ArrowLeft, Upload, CheckCircle, Clock, XCircle,
    User, CreditCard, Car, Shield, Eye, Trash2, Send, Camera, Sparkles, Brain
  } from 'lucide-react';
  import { useStore } from '@/store/useStore';
  import { useI18n } from '@/lib/i18n';
  import { supabase } from '@/lib/supabase';
  import { toast } from 'sonner';
  import { CameraCapture } from '@/components/CameraCapture';
  import { analyzeFile, getQualityLabel, computeAutoVerifyScore, type FrameAnalysis } from '@/services/kycService';

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
    analysis?: FrameAnalysis;
  }

  const ALL_DOCS: DocStep[] = [
    {
      id: 'cin_front', label: 'National ID (Front)', labelAr: 'البطاقة الوطنية (أمام)', labelFr: 'CIN (Recto)',
      desc: 'Clear photo of your National ID front side', descAr: 'صورة واضحة للبطاقة الوطنية من الأمام', descFr: 'Photo claire du recto de votre CIN',
      icon: CreditCard, status: 'not_uploaded',
    },
    {
      id: 'cin_back', label: 'National ID (Back)', labelAr: 'البطاقة الوطنية (خلف)', labelFr: 'CIN (Verso)',
      desc: 'Clear photo of your National ID back side', descAr: 'صورة واضحة للبطاقة الوطنية من الخلف', descFr: 'Photo claire du verso de votre CIN',
      icon: CreditCard, status: 'not_uploaded',
    },
    {
      id: 'selfie', label: 'Selfie with ID', labelAr: 'صورة شخصية مع البطاقة', labelFr: 'Selfie avec CIN',
      desc: 'Photo of yourself holding your ID next to your face', descAr: 'صورة شخصية وانت كاتمسك البطاقة بجانب وجهك', descFr: 'Photo de vous tenant votre CIN',
      icon: User, status: 'not_uploaded',
    },
    {
      id: 'driver_license', label: 'Driver License', labelAr: 'رخصة السياقة', labelFr: 'Permis de conduire',
      desc: 'Clear photo of your valid driver license', descAr: 'صورة واضحة لرخصة السياقة الصالحة', descFr: 'Photo claire de votre permis',
      icon: Shield, status: 'not_uploaded',
    },
    {
      id: 'gray_card', label: 'Gray Card (Registration)', labelAr: 'البطاقة الرمادية', labelFr: 'Carte Grise',
      desc: 'Vehicle registration card', descAr: 'بطاقة تسجيل السيارة', descFr: "Carte d'immatriculation du véhicule",
      icon: Shield, status: 'not_uploaded',
    },
    {
      id: 'insurance', label: 'Insurance Certificate', labelAr: 'شهادة التأمين', labelFr: "Attestation d'assurance",
      desc: 'Vehicle insurance certificate', descAr: 'شهادة التأمين للسيارة', descFr: "Attestation d'assurance",
      icon: Shield, status: 'not_uploaded',
    },
    {
      id: 'car_photo_front', label: 'Car Photo (Front)', labelAr: 'صورة السيارة (أمام)', labelFr: 'Photo voiture (Avant)',
      desc: 'Front view of your vehicle', descAr: 'صورة السيارة من القدام', descFr: 'Vue de face de votre véhicule',
      icon: Car, status: 'not_uploaded',
    },
    {
      id: 'car_photo_back', label: 'Car Photo (Back)', labelAr: 'صورة السيارة (خلف)', labelFr: 'Photo voiture (Arrière)',
      desc: 'Back view of your vehicle', descAr: 'صورة السيارة من الخلف', descFr: 'Vue de derrière',
      icon: Car, status: 'not_uploaded',
    },
  ];

  const SELFIE_IDS = ['selfie'];

  export default function VerificationPage() {
    const { user, setUser } = useStore();
    const { lang } = useI18n();
    const [steps, setSteps] = useState<DocStep[]>([...ALL_DOCS]);
    const [submitting, setSubmitting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [activeCameraDoc, setActiveCameraDoc] = useState<string | null>(null);
    const uploadingRef = useRef<Set<string>>(new Set());
    const allAnalyses = useRef<Record<string, FrameAnalysis>>({});

    /* ─── Load existing docs from DB ─── */
    const loadDocuments = useCallback(async () => {
      if (!user?.id) return;
      try {
        const { data: docs, error } = await supabase
          .from('verifications')
          .select('*')
          .eq('user_id', user.id);

        if (error) { console.warn('[Verify] load error:', error.message); return; }
        if (!docs?.length) return;

        setSteps((prev) =>
          prev.map((s) => {
            const d = docs.find((doc: any) => doc.doc_type === s.id);
            if (!d) return s;
            const url = d.public_url || d.url || undefined;
            return {
              ...s,
              status: d.status as DocStep['status'],
              url,
              filePath: d.storage_path || undefined,
              rejectionReason: d.rejection_reason || d.admin_notes || undefined,
            };
          })
        );

        const rejected = docs.find((d: any) => d.rejection_reason || d.admin_notes);
        if (rejected) setRejectionReason(rejected.rejection_reason || rejected.admin_notes || '');
      } catch (e) {
        console.warn('[Verify] load docs error', e);
      }
    }, [user?.id]);

    useEffect(() => { loadDocuments(); }, [loadDocuments]);

    /* ─── Realtime: watch verifications + profile changes ─── */
    useEffect(() => {
      if (!user?.id) return;
      const uid = user.id;
      const ch = supabase
        .channel(`vd-${uid}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'verifications', filter: `user_id=eq.${uid}` }, () => { loadDocuments(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, (payload) => {
          const p = payload.new as any;
          if (!p) return;
          const currentUser = useStore.getState().user;
          if (currentUser) setUser({ ...currentUser, is_verified: p.is_verified === true, verification_status: p.verification_status });
          if (p.is_verified) toast.success(lang === 'ar' ? '🎉 تم التحقق من حسابك!' : lang === 'fr' ? '🎉 Votre compte est vérifié!' : '🎉 Your account has been verified!');
          else if (p.verification_status === 'rejected') toast.error(lang === 'ar' ? 'تم رفض وثائقك' : lang === 'fr' ? 'Vos documents ont été rejetés' : 'Your documents were rejected');
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }, [user?.id]);

    /* ─── Upload (handles both camera + file input) ─── */
    const handleUpload = async (docId: string, file: File, analysis?: FrameAnalysis) => {
      if (uploadingRef.current.has(docId)) return;
      uploadingRef.current.add(docId);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        toast.error(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
        uploadingRef.current.delete(docId);
        return;
      }
      if (!user?.id) { uploadingRef.current.delete(docId); return; }

      setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'uploading' as const, errorMsg: undefined } : s));

      try {
        const uid = user.id;
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const fileName = `${docId}_${Date.now()}.${ext}`;
        const filePath = `${uid}/${docId}/${fileName}`;

        /* If no analysis passed, analyze the file now */
        let finalAnalysis = analysis;
        if (!finalAnalysis) {
          try { finalAnalysis = await analyzeFile(file); } catch { /* ignore */ }
        }
        if (finalAnalysis) allAnalyses.current[docId] = finalAnalysis;

        /* Upload to Supabase Storage */
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true, contentType: file.type || 'image/jpeg' });

        if (uploadError) throw new Error(`Storage: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        /* Save to DB with KYC quality data */
        const dbPayload: any = {
          user_id: uid,
          doc_type: docId,
          status: 'uploaded',
          storage_path: filePath,
          public_url: publicUrl,
          updated_at: new Date().toISOString(),
        };
        if (finalAnalysis) {
          dbPayload.ai_quality_score   = finalAnalysis.overallScore;
          dbPayload.blur_score         = finalAnalysis.blurScore;
          dbPayload.brightness_score   = finalAnalysis.brightnessScore;
          dbPayload.fraud_score        = finalAnalysis.fraudScore;
        }

        const { error: dbError } = await supabase
          .from('verifications')
          .upsert(dbPayload, { onConflict: 'user_id,doc_type' });

        if (dbError) {
          console.error('[Upload] DB ERROR:', dbError.message);
          /* Continue even if new columns don't exist yet */
          if (!dbError.message.includes('column')) throw new Error(`Database: ${dbError.message}`);
          /* Retry without new columns */
          await supabase.from('verifications').upsert({
            user_id: uid, doc_type: docId, status: 'uploaded',
            storage_path: filePath, public_url: publicUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,doc_type' });
        }

        setSteps((prev) =>
          prev.map((s) => s.id === docId ? { ...s, status: 'uploaded' as const, url: publicUrl, filePath, errorMsg: undefined, analysis: finalAnalysis } : s)
        );
        toast.success(lang === 'ar' ? '✅ تم تحميل الوثيقة بنجاح!' : lang === 'fr' ? '✅ Document téléchargé!' : '✅ Document uploaded successfully!');

        /* Check auto-verify eligibility */
        const allUploaded = Object.values(allAnalyses.current);
        if (allUploaded.length >= 3) {
          const { autoVerified, score } = computeAutoVerifyScore(allUploaded);
          if (autoVerified && score >= 80) {
            toast.success(lang === 'ar' ? '🤖 جودة ممتازة! يمكنك إرسال الوثائق للمراجعة' : lang === 'fr' ? '🤖 Excellent! Soumettez vos documents' : '🤖 Excellent quality! Ready to submit for review', { duration: 5000 });
          }
        }
      } catch (err: any) {
        setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'not_uploaded' as const, errorMsg: err.message } : s));
        toast.error((lang === 'ar' ? 'فشل التحميل: ' : 'Upload failed: ') + err.message);
      } finally {
        uploadingRef.current.delete(docId);
      }
    };

    /* Camera capture handler */
    const handleCameraCapture = (docId: string) => (file: File, analysis: FrameAnalysis) => {
      setActiveCameraDoc(null);
      handleUpload(docId, file, analysis);
    };

    /* ─── Delete ─── */
    const handleDelete = async (docId: string) => {
      if (!user?.id) return;
      const step = steps.find((s) => s.id === docId);
      try {
        if (step?.filePath) await supabase.storage.from(BUCKET).remove([step.filePath]);
        await supabase.from('verifications').delete().eq('user_id', user.id).eq('doc_type', docId);
        delete allAnalyses.current[docId];
        setSteps((prev) => prev.map((s) => s.id === docId ? { ...s, status: 'not_uploaded' as const, url: undefined, filePath: undefined, errorMsg: undefined, analysis: undefined } : s));
        toast.success(lang === 'ar' ? 'تم حذف الوثيقة' : 'Document removed');
      } catch (e: any) { toast.error('Failed: ' + e.message); }
    };

    /* ─── Submit for Review ─── */
    const handleSubmit = async () => {
      if (!user?.id) return;
      const uploadedDocs = steps.filter((s) => s.status === 'uploaded');
      if (uploadedDocs.length === 0) {
        toast.error(lang === 'ar' ? 'يرجى رفع وثيقة واحدة على الأقل' : 'Please upload at least one document');
        return;
      }
      setSubmitting(true);
      try {
        for (const doc of uploadedDocs) {
          await supabase.from('verifications').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('doc_type', doc.id);
        }
        await supabase.from('profiles').update({ verification_status: 'submitted', is_verified: false }).eq('id', user.id);
        setSteps((prev) => prev.map((s) => s.status === 'uploaded' ? { ...s, status: 'pending' as const } : s));
        const currentUser = useStore.getState().user;
        if (currentUser) setUser({ ...currentUser, verification_status: 'submitted', is_verified: false });
        toast.success(lang === 'ar' ? '📤 تم إرسال الوثائق للمراجعة!' : lang === 'fr' ? '📤 Documents soumis!' : '📤 Documents submitted for review!');
      } catch (err: any) { toast.error('Submit failed: ' + err.message); }
      setSubmitting(false);
    };

    /* ─── Helpers ─── */
    const getStatus = (s: DocStep['status']) => {
      switch (s) {
        case 'approved':  return { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: lang === 'ar' ? 'مقبول' : 'Approved', color: 'text-green-500' };
        case 'pending':   return { icon: <Clock className="w-5 h-5 text-blue-400" />, label: lang === 'ar' ? 'قيد المراجعة' : 'Under Review', color: 'text-blue-400' };
        case 'uploaded':  return { icon: <CheckCircle className="w-5 h-5 text-[#FF6B00]" />, label: lang === 'ar' ? 'تم التحميل' : 'Uploaded', color: 'text-[#FF6B00]' };
        case 'uploading': return { icon: <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />, label: lang === 'ar' ? 'جاري التحميل...' : 'Uploading...', color: 'text-[#FF6B00]' };
        case 'rejected':  return { icon: <XCircle className="w-5 h-5 text-red-500" />, label: lang === 'ar' ? 'مرفوض' : 'Rejected', color: 'text-red-500' };
        default:          return { icon: <div className="w-5 h-5 rounded-full border-2 border-white/20" />, label: lang === 'ar' ? 'لم يُرفع بعد' : 'Not Uploaded', color: 'text-[#A0A0A0]' };
      }
    };

    const getLabel = (step: DocStep) => lang === 'ar' ? step.labelAr : lang === 'fr' ? step.labelFr : step.label;
    const getDesc  = (step: DocStep) => lang === 'ar' ? step.descAr  : lang === 'fr' ? step.descFr  : step.desc;

    const uploadedCount = steps.filter((s) => ['uploaded', 'pending', 'approved'].includes(s.status)).length;
    const hasUploadedDocs = steps.some((s) => s.status === 'uploaded');
    const isVerified  = user?.is_verified === true || user?.verification_status === 'verified';
    const isSubmitted = user?.verification_status === 'submitted' || steps.some((s) => s.status === 'pending');
    const isRejected  = user?.verification_status === 'rejected' && !steps.some((s) => s.status === 'pending');

    const kycScore = computeAutoVerifyScore(Object.values(allAnalyses.current));

    /* Active camera step */
    const activeCamStep = activeCameraDoc ? steps.find(s => s.id === activeCameraDoc) : null;

    return (
      <div className="min-h-screen bg-[#0F1115] pt-16 pb-8">
        {/* Camera overlay */}
        <AnimatePresence>
          {activeCameraDoc && activeCamStep && (
            <CameraCapture
              docId={activeCamStep.id}
              docLabel={activeCamStep.label}
              docLabelAr={activeCamStep.labelAr}
              docLabelFr={activeCamStep.labelFr}
              isSelfie={SELFIE_IDS.includes(activeCamStep.id)}
              lang={lang}
              onCapture={handleCameraCapture(activeCamStep.id)}
              onCancel={() => setActiveCameraDoc(null)}
            />
          )}
        </AnimatePresence>

        <div className="max-w-lg mx-auto px-4">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/profile" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#FF6B00]" />
                {lang === 'ar' ? 'مركز التحقق الذكي KYC' : lang === 'fr' ? 'Centre KYC Intelligent' : 'Smart KYC Verification'}
              </h1>
              <p className="text-xs text-[#A0A0A0]">
                {lang === 'ar' ? 'تحقق ذكي تلقائي • تحليل الجودة • كشف التزوير' : lang === 'fr' ? 'Vérification intelligente • Analyse qualité • Détection fraude' : 'Smart auto-verification • Quality analysis • Fraud detection'}
              </p>
            </div>
          </div>

          {/* ── Status Banner ── */}
          {isVerified && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-400">{lang === 'ar' ? 'الحساب موثق ✓' : 'Account Verified ✓'}</p>
                <p className="text-xs text-[#A0A0A0]">{lang === 'ar' ? 'تمت الموافقة على وثائقك من طرف الإدارة' : 'Your documents were approved by admin'}</p>
              </div>
            </motion.div>
          )}

          {!isVerified && isSubmitted && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-400 shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-blue-400">{lang === 'ar' ? 'في انتظار مراجعة الإدارة' : 'Awaiting Admin Review'}</p>
                <p className="text-xs text-[#A0A0A0]">{lang === 'ar' ? 'سيتم إشعارك فور قبول أو رفض وثائقك' : 'You will be notified once your documents are reviewed'}</p>
              </div>
            </motion.div>
          )}

          {isRejected && !isVerified && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">{lang === 'ar' ? 'تم رفض الوثائق' : 'Documents Rejected'}</p>
                  {rejectionReason && <p className="text-xs text-[#A0A0A0] mt-0.5">{rejectionReason}</p>}
                  <p className="text-xs text-red-300 mt-1">{lang === 'ar' ? 'يمكنك إعادة رفع الوثائق المرفوضة' : 'You can re-upload the rejected documents'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── KYC Score Banner ── */}
          {Object.keys(allAnalyses.current).length >= 2 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 mb-6 border"
              style={{
                background: kycScore.autoVerified ? 'rgba(34,197,94,0.08)' : 'rgba(255,107,0,0.08)',
                borderColor: kycScore.autoVerified ? 'rgba(34,197,94,0.3)' : 'rgba(255,107,0,0.3)',
              }}>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 shrink-0" style={{ color: kycScore.autoVerified ? '#22c55e' : '#FF6B00' }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ color: kycScore.autoVerified ? '#22c55e' : '#FF6B00' }}>
                      {lang === 'ar' ? 'تقييم جودة الوثائق' : 'AI Document Quality Score'}
                    </p>
                    <span className="text-sm font-bold" style={{ color: kycScore.autoVerified ? '#22c55e' : '#FF6B00' }}>
                      {kycScore.score}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${kycScore.score}%`,
                      background: kycScore.autoVerified ? '#22c55e' : '#FF6B00',
                    }} />
                  </div>
                  <p className="text-xs text-[#A0A0A0] mt-1">
                    {kycScore.autoVerified
                      ? (lang === 'ar' ? '✅ الوثائق عالية الجودة — جاهز للإرسال' : '✅ High quality — ready to submit')
                      : (lang === 'ar' ? 'حاول تحسين جودة الصور للحصول على موافقة أسرع' : 'Improve photo quality for faster approval')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Progress Bar ── */}
          <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A0A0A0]">
                {uploadedCount}/{steps.length} {lang === 'ar' ? 'وثائق' : 'docs'}
              </span>
              <span className="text-sm font-medium text-[#FF6B00]">{Math.round((uploadedCount / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full transition-all duration-500"
                style={{ width: `${(uploadedCount / steps.length) * 100}%` }} />
            </div>
          </div>

          {/* ── Document Cards ── */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const st = getStatus(step.status);
              const canUpload = step.status === 'not_uploaded' || step.status === 'rejected';
              const canDelete = step.status === 'uploaded';
              const qualLabel = step.analysis ? getQualityLabel(step.analysis.overallScore, lang) : null;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                        <step.icon className="w-5 h-5 text-[#FF6B00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{getLabel(step)}</p>
                          <div className="flex items-center gap-1.5">
                            {st.icon}
                            <span className={`text-xs ${st.color}`}>{st.label}</span>
                          </div>
                        </div>
                        <p className="text-xs text-[#A0A0A0] mt-0.5">{getDesc(step)}</p>

                        {/* AI Quality Badge */}
                        {qualLabel && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Sparkles className="w-3 h-3" style={{ color: qualLabel.color }} />
                            <span className="text-xs font-medium" style={{ color: qualLabel.color }}>
                              {lang === 'ar' ? 'جودة: ' : 'Quality: '}{qualLabel.label}
                            </span>
                            <span className="text-xs text-[#A0A0A0]">({step.analysis!.overallScore}/100)</span>
                          </div>
                        )}

                        {step.errorMsg && (
                          <p className="text-xs text-red-400 mt-1 bg-red-500/10 px-2 py-1 rounded-lg">⚠️ {step.errorMsg}</p>
                        )}
                        {step.status === 'rejected' && step.rejectionReason && (
                          <p className="text-xs text-red-300 mt-1 bg-red-500/10 px-2 py-1 rounded-lg">
                            {lang === 'ar' ? 'سبب الرفض: ' : 'Reason: '}{step.rejectionReason}
                          </p>
                        )}

                        {/* Document Preview */}
                        {step.url && (
                          <div className="mt-3 relative">
                            <img src={step.url} alt={step.label} className="w-full h-32 object-cover rounded-lg border border-white/5"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button onClick={() => setPreviewUrl(step.url || null)}
                                className="w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                                <Eye className="w-4 h-4 text-white" />
                              </button>
                              {canDelete && (
                                <button onClick={() => handleDelete(step.id)}
                                  className="w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center hover:bg-red-500/80 transition-colors">
                                  <Trash2 className="w-4 h-4 text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Upload / Camera Buttons */}
                        {canUpload && (
                          <div className="mt-3 flex gap-2">
                            {/* Camera capture */}
                            <button
                              onClick={() => setActiveCameraDoc(step.id)}
                              className="flex-1 h-10 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center gap-2 hover:bg-[#FF6B00]/20 transition-all"
                            >
                              <Camera className="w-4 h-4 text-[#FF6B00]" />
                              <span className="text-xs text-[#FF6B00] font-medium">
                                {lang === 'ar' ? 'تصوير' : lang === 'fr' ? 'Caméra' : 'Camera'}
                              </span>
                            </button>
                            {/* File upload fallback */}
                            <label className="flex-1">
                              <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(step.id, f); e.target.value = ''; }} />
                              <div className="h-10 rounded-lg border border-dashed border-white/20 flex items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition-all cursor-pointer">
                                <Upload className="w-4 h-4 text-[#A0A0A0]" />
                                <span className="text-xs text-[#A0A0A0]">
                                  {step.status === 'rejected'
                                    ? (lang === 'ar' ? 'إعادة الرفع' : 'Re-upload')
                                    : (lang === 'ar' ? 'من المعرض' : lang === 'fr' ? 'Galerie' : 'Gallery')}
                                </span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Submit Button ── */}
          {!isVerified && !isSubmitted && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <button onClick={handleSubmit} disabled={!hasUploadedDocs || submitting}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  hasUploadedDocs && !submitting
                    ? 'bg-[#FF6B00] hover:bg-[#E56000] text-white shadow-lg shadow-[#FF6B00]/20'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'}`}>
                {submitting
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                {submitting
                  ? (lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                  : !hasUploadedDocs
                  ? (lang === 'ar' ? 'ارفع وثيقة واحدة على الأقل' : 'Upload at least one document')
                  : (lang === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review')}
              </button>
              {hasUploadedDocs && (
                <p className="text-xs text-[#A0A0A0] text-center mt-2">
                  {uploadedCount} {lang === 'ar' ? 'وثائق جاهزة للإرسال' : 'document(s) ready to submit'}
                </p>
              )}
            </motion.div>
          )}

          {/* Full-screen preview modal */}
          {previewUrl && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            </div>
          )}
        </div>
      </div>
    );
  }
  