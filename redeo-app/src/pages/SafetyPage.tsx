import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Check, Users, FileCheck, AlertTriangle, MessageCircle, Phone } from 'lucide-react';

const SAFETY_FEATURES = [
  { icon: FileCheck, title: 'Verified Drivers', desc: 'Every driver submits their CIN, driving license, vehicle registration, insurance, and a selfie for identity verification. Our team reviews each application within 24-48 hours.' },
  { icon: Users, title: 'Profile Transparency', desc: 'View full driver profiles including ratings, trip count, vehicle details, and verification status before booking. Know who you are traveling with.' },
  { icon: Shield, title: 'Secure Payments', desc: 'All payments are processed through encrypted channels. Your money is held securely and only released to the driver after the trip is completed.' },
  { icon: MessageCircle, title: 'In-App Chat', desc: 'Communicate with your driver directly through our app. No need to share personal phone numbers until you feel comfortable.' },
  { icon: Phone, title: 'Emergency Support', desc: 'Our 24/7 support team is always available. Report any issue during your trip and we will respond immediately.' },
  { icon: AlertTriangle, title: 'Report System', desc: 'Every trip can be rated and reviewed. Drivers and passengers with concerning behavior are flagged and investigated promptly.' },
];

const TIPS = [
  'Check the driver\'s profile and verification badge before booking.',
  'Share your trip details with a friend or family member.',
  'Meet at public, well-lit pickup locations.',
  'Verify the car model and license plate before entering.',
  'Trust your instincts — if something feels off, cancel and contact support.',
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Safety</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Shield className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-white mb-2">Your Safety is Our Priority</h2>
          <p className="text-sm text-[#A0A0A0] max-w-md mx-auto">
            We've built multiple layers of protection to ensure every trip is safe, secure, and comfortable.
          </p>
        </motion.div>

        <div className="space-y-3 mb-8">
          {SAFETY_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#1B1F27] rounded-xl p-5 border border-white/5"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Safety Tips for Passengers</h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#A0A0A0]">
                <Check className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="text-center">
          <p className="text-sm text-[#A0A0A0] mb-3">Need to report an incident?</p>
          <Link to="/support" className="inline-block bg-[#FF6B00] hover:bg-[#E56000] text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
