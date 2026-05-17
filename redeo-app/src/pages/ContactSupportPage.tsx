import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, MessageCircle, Loader2, CheckCircle, X, Camera,
  Paperclip, AlertTriangle, Mail, User, FileText, Inbox,
  ChevronRight, Shield,
} from 'lucide-react';

/* ─── Honeypot hidden field name ─── */
const HONEYPOT = 'website';

/* ─── Rate limit helper ─── */
function canSendTicket(userId: string): boolean {
  const key = `wansniauto_support_limit_${userId}`;
  const last = localStorage.getItem(key);
  if (!last) return true;
  const diff = Date.now() - parseInt(last, 10);
  // 2 minutes cooldown
  return diff > 120000;
}

function recordTicketSent(userId: string) {
  localStorage.setItem(`wansniauto_support_limit_${userId}`, String(Date.now()));
}

/* ─── Support ticket from Supabase ─── */
interface SupportTicket {
  id: string;
  user_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  screenshot_url?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

/* ─── Screenshot file state ─── */
interface ScreenshotFile {
  file: File;
  preview: string;
}

export function ContactSupportPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { lang, dir } = useI18n();

  /* ─── Form state ─── */
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ─── Ticket history ─── */
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* ─── Validation errors ─── */
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Translations ─── */
  const T = {
    en: {
      title: 'Contact Support',
      subtitle: 'We are here to help. Send us a message and we will reply as soon as possible.',
      name: 'Full Name',
      email: 'Email Address',
      subject: 'Subject',
      message: 'Your Message',
      screenshot: 'Add Screenshot (optional)',
      send: 'Send Message',
      sending: 'Sending...',
      success: 'Message sent! Our team will reply soon.',
      error: 'Failed to send. Please try again.',
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email',
      tooShort: 'Message is too short (min 20 characters)',
      spamDetected: 'Spam detected. Please try again later.',
      rateLimited: 'Please wait 2 minutes before sending another message.',
      history: 'My Tickets',
      noTickets: 'No support tickets yet',
      status_open: 'Open',
      status_in_progress: 'In Progress',
      status_resolved: 'Resolved',
      status_closed: 'Closed',
      faqTitle: 'Frequently Asked Questions',
      faq1q: 'How do I book a ride?',
      faq1a: 'Search for your route, select a driver, and book your seat in seconds.',
      faq2q: 'How do I become a driver?',
      faq2a: 'Register as a driver, complete verification with your documents, and start publishing trips.',
      faq3q: 'Is my payment secure?',
      faq3a: 'Yes, all payments are processed securely through our encrypted platform.',
      faq4q: 'How do I cancel a booking?',
      faq4a: 'Go to My Trips, find your booking, and tap Cancel. Refunds are processed within 5-7 days.',
      faq5q: 'How does driver verification work?',
      faq5a: 'Upload your CIN, license, registration, insurance, and selfie. Our team reviews within 24-48 hours.',
      contactEmail: 'wansniauto@protonmail.com',
      replyTime: 'We usually reply within 24 hours',
      newTicket: 'New Ticket',
    },
    fr: {
      title: 'Contacter le Support',
      subtitle: 'Nous sommes la pour vous aider. Envoyez-nous un message et nous repondrons des que possible.',
      name: 'Nom Complet',
      email: 'Adresse Email',
      subject: 'Sujet',
      message: 'Votre Message',
      screenshot: 'Ajouter une Capture (optionnel)',
      send: 'Envoyer le Message',
      sending: 'Envoi...',
      success: 'Message envoye! Notre equipe repondra bientot.',
      error: 'Echec de l\'envoi. Veuillez reessayer.',
      required: 'Ce champ est obligatoire',
      invalidEmail: 'Veuillez entrer un email valide',
      tooShort: 'Message trop court (min 20 caracteres)',
      spamDetected: 'Spam detecte. Veuillez reessayer plus tard.',
      rateLimited: 'Veuillez attendre 2 minutes avant d\'envoyer un autre message.',
      history: 'Mes Tickets',
      noTickets: 'Aucun ticket de support',
      status_open: 'Ouvert',
      status_in_progress: 'En Cours',
      status_resolved: 'Resolu',
      status_closed: 'Ferme',
      faqTitle: 'Questions Frequentes',
      faq1q: 'Comment reserver un trajet?',
      faq1a: 'Recherchez votre itineraire, selectionnez un conducteur, et reservez votre place.',
      faq2q: 'Comment devenir conducteur?',
      faq2a: 'Inscrivez-vous comme conducteur, completez la verification, et publiez des trajets.',
      faq3q: 'Mon paiement est-il securise?',
      faq3a: 'Oui, tous les paiements sont traites de maniere securisee via notre plateforme cryptee.',
      faq4q: 'Comment annuler une reservation?',
      faq4a: 'Allez dans Mes Trajets, trouvez votre reservation, et appuyez sur Annuler.',
      faq5q: 'Comment fonctionne la verification conducteur?',
      faq5a: 'Telechargez votre CIN, permis, carte grise, assurance, et selfie. Notre equipe verifie en 24-48h.',
      contactEmail: 'wansniauto@protonmail.com',
      replyTime: 'Nous repondons generalement sous 24 heures',
      newTicket: 'Nouveau Ticket',
    },
    ar: {
      title: 'مركز الدعم',
      subtitle: 'فريقنا جاهز يساعدك. بعث لينا رسالة وغادي نجاوبوك في أقرب وقت.',
      name: 'السمية الكاملة',
      email: 'البريد الإلكتروني',
      subject: 'الموضوع',
      message: 'الرسالة ديالك',
      screenshot: 'زيد صورة (اختياري)',
      send: 'بعث الرسالة',
      sending: 'فالإرسال...',
      success: 'تم إرسال الرسالة! فريقنا غادي يجاوبك قريب.',
      error: 'فشل الإرسال. جرب من جديد.',
      required: 'هاد الحقل ضروري',
      invalidEmail: 'دخل إيميل صحيح',
      tooShort: 'الرسالة قصيرة بزاف (20 حرف على الأقل)',
      spamDetected: 'سبام! جرب من بعد.',
      rateLimited: 'استنى 2 دقايق قبل ما تبعث رسالة أخرى.',
      history: 'تيكي ديالي',
      noTickets: 'ماعندك حتى تيكي',
      status_open: 'مفتوح',
      status_in_progress: 'فالمعالجة',
      status_resolved: 'تحل',
      status_closed: 'مسدود',
      faqTitle: 'الأسئلة المتكررة',
      faq1q: 'كيفاش نحجز رحلة؟',
      faq1a: 'قلب على مسارك، اختار السائق، وحجز الكرسي ديالك فثواني.',
      faq2q: 'كيفاش نولي سائق؟',
      faq2a: 'سجل كسائق، كمل التحقق بالوثائق ديالك، وابدا نشر الرحلات.',
      faq3q: 'الدفع ديالي آمن؟',
      faq3a: 'ايه، كل المدفوعات كاتمشي بأمان عبر منصتنا المشفرة.',
      faq4q: 'كيفاش نلغي الحجز؟',
      faq4a: 'روح لرحلاتي، لقى الحجز ديالك، وضغط على لغي.',
      faq5q: 'كيفاش كاتمشي verification ديال السائق؟',
      faq5a: 'حمل CIN، رخصة السياقة، البطاقة الرمادية، التأمين، والصورة. فريقنا كيراجع ف24-48 ساعة.',
      contactEmail: 'wansniauto@protonmail.com',
      replyTime: 'عادة كنجاوبو ف24 ساعة',
      newTicket: 'تيكي جديد',
    },
  }[lang];

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'bg-green-500/10 text-green-400';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400';
      case 'resolved': return 'bg-[#FF6B00]/10 text-[#FF6B00]';
      default: return 'bg-white/5 text-[#A0A0A0]';
    }
  };

  /* ─── Validate form ─── */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = T.required;
    if (!email.trim()) errs.email = T.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = T.invalidEmail;
    if (!subject.trim()) errs.subject = T.required;
    if (!message.trim()) errs.message = T.required;
    else if (message.trim().length < 20) errs.message = T.tooShort;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ─── Handle screenshot selection ─── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScreenshot({ file, preview: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ─── Remove screenshot ─── */
  const removeScreenshot = () => setScreenshot(null);

  /* ─── Submit ticket ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot spam check
    if (honeypot) {
      toast.error(T.spamDetected);
      return;
    }

    // Rate limit
    if (user?.id && !canSendTicket(user.id)) {
      toast.error(T.rateLimited);
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let screenshotUrl = '';

      // Upload screenshot if present
      if (screenshot) {
        const fileName = `support/${user?.id || 'anon'}/${Date.now()}_${screenshot.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('support-screenshots')
          .upload(fileName, screenshot.file, { upsert: true });
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('support-screenshots').getPublicUrl(fileName);
          screenshotUrl = urlData?.publicUrl || '';
        }
      }

      const ticketData = {
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        screenshot_url: screenshotUrl || null,
        status: 'open',
        created_at: new Date().toISOString(),
      };

      // Save to Supabase
      const { error } = await supabase.from('support_tickets').insert(ticketData);

      if (error) {
        // Fallback: save to localStorage
        const localTickets = JSON.parse(localStorage.getItem('wansniauto_support_tickets') || '[]');
        localTickets.push({ ...ticketData, id: `local-${Date.now()}` });
        localStorage.setItem('wansniauto_support_tickets', JSON.stringify(localTickets));
        console.warn('Supabase save failed, using localStorage:', error.message);
      }

      // Rate limit
      if (user?.id) recordTicketSent(user.id);

      toast.success(T.success);
      setSubmitted(true);
      setSubject('');
      setMessage('');
      setScreenshot(null);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(T.error);
    }

    setIsSubmitting(false);
  };

  /* ─── Load ticket history ─── */
  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setTickets(data as SupportTicket[]);
      } else {
        // Fallback to localStorage
        const localTickets = JSON.parse(localStorage.getItem('wansniauto_support_tickets') || '[]')
          .filter((t: any) => t.user_id === user.id);
        setTickets(localTickets);
      }
    } catch {
      const localTickets = JSON.parse(localStorage.getItem('wansniauto_support_tickets') || '[]')
        .filter((t: any) => t.user_id === user.id);
      setTickets(localTickets);
    }
    setLoadingHistory(false);
  }, [user?.id]);

  // Load history on mount
  useCallback(() => { loadHistory(); }, [loadHistory]);

  /* ════════════════════════════════════════════
     SUBMITTED SUCCESS VIEW
     ════════════════════════════════════════════ */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 pb-8" dir={dir}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-3">{T.success}</h2>
          <p className="text-sm text-[#A0A0A0] mb-2">{T.replyTime}</p>
          <p className="text-xs text-[#FF6B00]/60 mb-8">{T.contactEmail}</p>

          <div className="space-y-3">
            <Button
              onClick={() => { setSubmitted(false); setSubject(''); setMessage(''); }}
              className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-12"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> {T.newTicket}
            </Button>
            <Button
              onClick={() => { loadHistory(); setShowHistory(true); }}
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/5 rounded-xl h-12"
            >
              <Inbox className="w-4 h-4 mr-2" /> {T.history}
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-12"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </Button>
          </div>

          {/* Ticket history after submit */}
          {showHistory && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-left">
              <h3 className="text-sm font-medium text-white mb-3">{T.history}</h3>
              {loadingHistory ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" /></div>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-[#A0A0A0] text-center py-4">{T.noTickets}</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map(t => (
                    <div key={t.id} className="bg-[#1B1F27] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white font-medium truncate">{t.subject}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                          {(T as any)[`status_${t.status}`] || t.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#A0A0A0] truncate">{t.message}</p>
                      <p className="text-[10px] text-[#A0A0A0]/50 mt-1">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     MAIN FORM VIEW
     ════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8" dir={dir}>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{T.title}</h1>
            <p className="text-xs text-[#A0A0A0]">{T.subtitle}</p>
          </div>
        </div>

        {/* Contact Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-4 mb-6 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-xs text-[#A0A0A0]">{T.replyTime}</p>
            <p className="text-sm text-[#FF6B00] font-medium">{T.contactEmail}</p>
          </div>
        </motion.div>

        {/* Support Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Honeypot (hidden from real users) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name={HONEYPOT}
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF6B00]" /> {T.name} *
            </label>
            <Input
              value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              placeholder={T.name}
              className={`bg-[#1B1F27] border ${errors.name ? 'border-red-500/50' : 'border-white/10'} text-white rounded-xl h-11`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#FF6B00]" /> {T.email} *
            </label>
            <Input
              type="email"
              value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder={T.email}
              className={`bg-[#1B1F27] border ${errors.email ? 'border-red-500/50' : 'border-white/10'} text-white rounded-xl h-11`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF6B00]" /> {T.subject} *
            </label>
            <Input
              value={subject} onChange={e => { setSubject(e.target.value); setErrors(p => ({ ...p, subject: '' })); }}
              placeholder={T.subject}
              className={`bg-[#1B1F27] border ${errors.subject ? 'border-red-500/50' : 'border-white/10'} text-white rounded-xl h-11`}
            />
            {errors.subject && <p className="text-xs text-red-400 mt-1">{errors.subject}</p>}
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-[#FF6B00]" /> {T.message} *
            </label>
            <Textarea
              value={message} onChange={e => { setMessage(e.target.value); setErrors(p => ({ ...p, message: '' })); }}
              placeholder={T.message}
              className={`bg-[#1B1F27] border ${errors.message ? 'border-red-500/50' : 'border-white/10'} text-white rounded-xl min-h-[140px] resize-none`}
            />
            {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
            <p className="text-[10px] text-[#A0A0A0]/50 mt-1 text-right">{message.length} chars</p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="text-xs text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#FF6B00]" /> {T.screenshot}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            {!screenshot ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/10 hover:border-[#FF6B00]/30 hover:bg-[#FF6B00]/5 transition-all"
              >
                <Paperclip className="w-4 h-4 text-[#A0A0A0]" />
                <span className="text-sm text-[#A0A0A0]">Click to attach a screenshot</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={screenshot.preview} alt="Screenshot" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <p className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded-full">
                  {(screenshot.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          {/* Spam protection indicator */}
          <div className="flex items-center gap-2 text-[10px] text-[#A0A0A0]/40">
            <Shield className="w-3 h-3" />
            <span>Protected by spam detection</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-13 text-base font-semibold shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> {T.send}</>}
          </Button>
        </motion.form>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FF6B00]" /> {T.faqTitle}
          </h3>
          <div className="space-y-2">
            {[
              { q: T.faq1q, a: T.faq1a },
              { q: T.faq2q, a: T.faq2a },
              { q: T.faq3q, a: T.faq3a },
              { q: T.faq4q, a: T.faq4a },
              { q: T.faq5q, a: T.faq5a },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}

/* ─── FAQ Accordion Item ─── */
function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm text-white font-medium pr-4">{question}</span>
        <ChevronRight className={`w-4 h-4 text-[#A0A0A0] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4"
        >
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
