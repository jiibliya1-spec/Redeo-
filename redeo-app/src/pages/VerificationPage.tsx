import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Upload, CheckCircle, Clock, XCircle, FileText,
  User, CreditCard, Car, Shield, AlertCircle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { User as UserType } from '@/types';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';

interface DocStep {
  id: string;
  label: string;
  labelAr: string;
  labelFr: string;
  icon: any;
  category: 'identity' | 'driver' | 'vehicle';
  status: 'pending' | 'uploaded' | 'approved' | 'rejected' | 'not_uploaded';
  url?: string;
  rejectionReason?: string;
}

const DRIVER_DOCS: DocStep[] = [
  { id: 'cin_front', label: 'CIN (Front)', labelAr: 'البطاقة الوطنية (أمام)', labelFr: 'CIN (Recto)', icon: CreditCard, category: 'identity', status: 'not_uploaded' },
  { id: 'cin_back', label: 'CIN (Back)', labelAr: 'البطاقة الوطنية (خلف)', labelFr: 'CIN (Verso)', icon: CreditCard, category: 'identity', status: 'not_uploaded' },
  { id: 'selfie', label: 'Selfie with CIN', labelAr: 'صورة شخصية مع البطاقة', labelFr: 'Selfie avec CIN', icon: User, category: 'identity', status: 'not_uploaded' },
  { id: 'driver_license', label: 'Driver License', labelAr: 'رخصة السياقة', labelFr: 'Permis de conduire', icon: FileText, category: 'driver', status: 'not_uploaded' },
  { id: 'vehicle_registration', label: 'Vehicle Registration', labelAr: 'البطاقة الرمادية', labelFr: 'Carte grise', icon: Car, category: 'vehicle', status: 'not_uploaded' },
  { id: 'insurance', label: 'Insurance Certificate', labelAr: 'شهادة التأمين', labelFr: 'Attestation d\'assurance', icon: Shield, category: 'vehicle', status: 'not_uploaded' },
  { id: 'car_photo_front', label: 'Car Photo (Front)', labelAr: 'صورة السيارة (أمام)', labelFr: 'Photo voiture (Avant)', icon: Car, category: 'vehicle', status: 'not_uploaded' },
  { id: 'car_photo_back', label: 'Car Photo (Back)', labelAr: 'صورة السيارة (خلف)', labelFr: 'Photo voiture (Arrière)', icon: Car, category: 'vehicle', status: 'not_uploaded' },
];

const PASSENGER_DOCS: DocStep[] = [
  { id: 'cin_front', label: 'CIN (Front)', labelAr: 'البطاقة الوطنية (أمام)', labelFr: 'CIN (Recto)', icon: CreditCard, category: 'identity', status: 'not_uploaded' },
  { id: 'cin_back', label: 'CIN (Back)', labelAr: 'البطاقة الوطنية (خلف)', labelFr: 'CIN (Verso)', icon: CreditCard, category: 'identity', status: 'not_uploaded' },
  { id: 'selfie', label: 'Selfie with CIN', labelAr: 'صورة شخصية مع البطاقة', labelFr: 'Selfie avec CIN', icon: User, category: 'identity', status: 'not_uploaded' },
];

export default function VerificationPage() {
  const { user, setUser, mode } = useStore();
  const { t, lang } = useI18n();
  const [steps, setSteps] = useState<DocStep[]>(mode === 'driver' ? [...DRIVER_DOCS] : [...PASSENGER_DOCS]);
  const [, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM',
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }, []);

  // Load documents from Supabase
  const loadDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/verification_documents?select=*&user_id=eq.${user.id}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) return;
      const docs = await res.json();
      if (!docs || !Array.isArray(docs)) return;

      setSteps((prev) =>
        prev.map((s) => {
          const found = docs.find((d: any) => d.doc_type === s.id);
          return found
            ? {
                ...s,
                status: found.status === 'pending' ? 'uploaded' as const : found.status,
                url: found.public_url || '',
                rejectionReason: found.rejection_reason || '',
              }
            : s;
        })
      );

      // Check for rejection
      const rejected = docs.find((d: any) => d.rejection_reason);
      if (rejected) setRejectionReason(rejected.rejection_reason);
    } catch (e) {
      console.log('[Verification] Load docs error:', e);
    }
  }, [user?.id, getHeaders]);

  // Load on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Realtime subscription for verification changes
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    const channel = supabase
      .channel(`verification-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verification_documents', filter: `user_id=eq.${uid}` },
        () => {
          loadDocuments();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        async (payload) => {
          const p = payload.new as any;
          const freshUser = { ...user };
          if (freshUser) {
            const updatedUser = {
              ...freshUser,
              is_verified: p.is_verified === true,
              verification_status: p.verification_status || 'unverified',
            };
            setUser(updatedUser);

            if (p.is_verified && p.verification_status === 'verified') {
              toast.success(t('verify.approved_toast') || 'Your documents have been verified!');
            } else if (p.verification_status === 'rejected') {
              toast.error(t('verify.rejected_toast') || 'Your verification was rejected. Please re-upload.');
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Polling fallback
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(loadDocuments, 10000);
    return () => clearInterval(interval);
  }, [user?.id, loadDocuments]);

  // Upload document
  const handleUpload = async (docId: string, file: File) => {
    if (!user?.id) return;
    const uid = user.id;

    setLoading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${uid}/${docId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 3. Upsert into verification_documents
      const headers = await getHeaders();
      const docInfo = steps.find((s) => s.id === docId);

      // Try to insert; if conflict, update instead
      const postRes = await fetch(
        `${SUPABASE_URL}/rest/v1/verification_documents`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id: uid,
            doc_type: docId,
            doc_category: docInfo?.category || 'identity',
            status: 'pending',
            storage_path: filePath,
            public_url: publicUrl,
          }),
        }
      );

      if (!postRes.ok && postRes.status !== 409) {
        throw new Error('Failed to save document record');
      }

      setSteps((prev) =>
        prev.map((s) => (s.id === docId ? { ...s, status: 'uploaded', url: publicUrl } : s))
      );
      toast.success(t('verify.upload_success') || 'Document uploaded!');
    } catch (err: any) {
      toast.error(t('verify.upload_error') || 'Upload failed: ' + err.message);
    }
    setLoading(false);
  };

  // Submit all for review
  const handleSubmitForReview = async () => {
    if (!user?.id) return;
    const uid = user.id;

    const uploaded = steps.filter((s) => s.status === 'uploaded');
    if (uploaded.length === 0) {
      toast.error(t('verify.no_docs') || 'Please upload at least one document');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getHeaders();

      // Update all uploaded docs to pending
      for (const doc of uploaded) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/verification_documents?user_id=eq.${uid}&doc_type=eq.${doc.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'pending', updated_at: new Date().toISOString() }),
          }
        );
      }

      // Update profile status
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            verification_status: 'submitted',
            is_verified: false,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      setSteps((prev) =>
        prev.map((s) => (s.status === 'uploaded' ? { ...s, status: 'pending' as const } : s))
      );

      const freshUser: UserType = { ...user!, verification_status: 'submitted', is_verified: false };
      setUser(freshUser);
      toast.success(t('verify.submitted') || 'Documents submitted for review!');
    } catch {
      toast.error(t('verify.submit_error') || 'Submit failed');
    }
    setSubmitting(false);
  };

  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'uploaded': return <Upload className="w-5 h-5 text-blue-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-white/20" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return lang === 'ar' ? 'مقبول' : lang === 'fr' ? 'Approuvé' : 'Approved';
      case 'pending': return lang === 'ar' ? 'قيد المراجعة' : lang === 'fr' ? 'En attente' : 'Pending Review';
      case 'uploaded': return lang === 'ar' ? 'محمل' : lang === 'fr' ? 'Téléchargé' : 'Uploaded';
      case 'rejected': return lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Rejeté' : 'Rejected';
      default: return lang === 'ar' ? 'لم يُحمّل' : lang === 'fr' ? 'Non téléchargé' : 'Not Uploaded';
    }
  };

  const getLabel = (step: DocStep) => {
    if (lang === 'ar') return step.labelAr;
    if (lang === 'fr') return step.labelFr;
    return step.label;
  };

  const uploadedCount = steps.filter((s) => s.status === 'uploaded' || s.status === 'pending' || s.status === 'approved').length;
  const totalCount = steps.length;
  const allUploaded = uploadedCount === totalCount;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-16 pb-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-lg font-semibold text-white">
            {mode === 'driver'
              ? (lang === 'ar' ? 'التحقق من السائق' : lang === 'fr' ? 'Vérification Conducteur' : 'Driver Verification')
              : (lang === 'ar' ? 'التحقق من الهوية' : lang === 'fr' ? 'Vérification Identité' : 'Identity Verification')}
          </h1>
        </div>

        {/* Status Banner */}
        {user?.verification_status === 'verified' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">
                {lang === 'ar' ? 'تم التحقق!' : lang === 'fr' ? 'Vérifié!' : 'Verified!'}
              </p>
              <p className="text-xs text-[#A0A0A0]">
                {lang === 'ar' ? 'وثائقك مقبولة. يمكنك استخدام التطبيق.' : lang === 'fr' ? 'Documents approuvés. Vous pouvez utiliser l\'app.' : 'Your documents are approved. You can now use the app.'}
              </p>
            </div>
          </motion.div>
        )}

        {user?.verification_status === 'submitted' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-400">
                {lang === 'ar' ? 'قيد المراجعة' : lang === 'fr' ? 'En cours de révision' : 'Under Review'}
              </p>
              <p className="text-xs text-[#A0A0A0]">
                {lang === 'ar' ? 'وثائقك قيد المراجعة. سيتم إشعارك قريباً.' : lang === 'fr' ? 'Documents en révision. Notification prochainement.' : 'Your documents are being reviewed. You will be notified soon.'}
              </p>
            </div>
          </motion.div>
        )}

        {user?.verification_status === 'rejected' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  {lang === 'ar' ? 'مرفوض' : lang === 'fr' ? 'Rejeté' : 'Rejected'}
                </p>
                <p className="text-xs text-[#A0A0A0]">
                  {lang === 'ar' ? 'السبب: ' : lang === 'fr' ? 'Raison: ' : 'Reason: '}
                  {rejectionReason || (lang === 'ar' ? 'غير محدد' : lang === 'fr' ? 'Non spécifié' : 'Not specified')}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#A0A0A0] mt-2">
              {lang === 'ar' ? 'يرجى إعادة تحميل الوثائق الصحيحة.' : lang === 'fr' ? 'Veuillez re-télécharger les documents corrects.' : 'Please re-upload the correct documents below.'}
            </p>
          </motion.div>
        )}

        {/* Progress */}
        <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#A0A0A0]">
              {lang === 'ar' ? `${uploadedCount}/${totalCount} وثائق` : lang === 'fr' ? `${uploadedCount}/${totalCount} documents` : `${uploadedCount}/${totalCount} documents`}
            </span>
            <span className="text-sm font-medium text-[#FF6B00]">
              {Math.round((uploadedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-full transition-all duration-300"
              style={{ width: `${(uploadedCount / totalCount) * 100}%` }} />
          </div>
        </div>

        {/* Document Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{getLabel(step)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getStatusIcon(step.status)}
                        <span className={`text-xs ${
                          step.status === 'approved' ? 'text-green-500' :
                          step.status === 'rejected' ? 'text-red-500' :
                          step.status === 'pending' ? 'text-yellow-500' :
                          step.status === 'uploaded' ? 'text-blue-500' : 'text-[#A0A0A0]'
                        }`}>{getStatusLabel(step.status)}</span>
                      </div>
                    </div>
                  </div>

                  {step.status === 'not_uploaded' || step.status === 'rejected' ? (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(step.id, file);
                          e.target.value = '';
                        }}
                      />
                      <div className="w-9 h-9 rounded-xl bg-[#FF6B00] hover:bg-[#E56000] flex items-center justify-center transition-colors">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </label>
                  ) : step.url ? (
                    <button onClick={() => window.open(step.url, '_blank')}
                      className="text-xs text-[#FF6B00] hover:underline">
                      {lang === 'ar' ? 'شوف' : lang === 'fr' ? 'Voir' : 'View'}
                    </button>
                  ) : null}
                </div>

                {/* Rejection reason per doc */}
                {step.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {step.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        {user?.verification_status !== 'verified' && user?.verification_status !== 'submitted' && (
          <button
            onClick={handleSubmitForReview}
            disabled={!allUploaded || submitting}
            className={`w-full mt-6 py-3 rounded-xl font-medium text-sm transition-all ${
              allUploaded && !submitting
                ? 'bg-[#FF6B00] hover:bg-[#E56000] text-white'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            {submitting
              ? (lang === 'ar' ? 'جاري الإرسال...' : lang === 'fr' ? 'Envoi en cours...' : 'Submitting...')
              : allUploaded
                ? (lang === 'ar' ? 'أرسل للمراجعة' : lang === 'fr' ? 'Soumettre pour révision' : 'Submit for Review')
                : (lang === 'ar' ? 'حمّل كل الوثائق أولاً' : lang === 'fr' ? 'Téléchargez tous les documents' : 'Upload all documents first')}
          </button>
        )}

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#A0A0A0]/50">
            {mode === 'driver'
              ? (lang === 'ar' ? 'كل الوثائق ضرورية باش تولي سائق مفحوص.' : lang === 'fr' ? 'Tous les documents sont requis pour être conducteur vérifié.' : 'All documents are required to become a verified driver.')
              : (lang === 'ar' ? 'تحقق الهوية اختياري للمسافرين.' : lang === 'fr' ? 'La vérification d\'identité est facultative pour les passagers.' : 'Identity verification is optional for passengers.')}
          </p>
        </div>
      </div>
    </div>
  );
}
