import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Calendar, CreditCard, Car, Star } from 'lucide-react';

const STEPS = [
  { num: '01', icon: Search, title: 'Search Your Route', desc: 'Enter your departure city, destination, and travel date. Browse available rides from verified drivers instantly.' },
  { num: '02', icon: Calendar, title: 'Choose & Book', desc: 'Compare prices, car types, and driver ratings. Select the ride that fits your schedule and budget.' },
  { num: '03', icon: CreditCard, title: 'Secure Payment', desc: 'Pay securely through our platform. Your payment is held safely until the trip is completed successfully.' },
  { num: '04', icon: Car, title: 'Enjoy the Ride', desc: 'Meet your driver at the pickup point. Sit back, relax, and enjoy a comfortable journey across Morocco.' },
  { num: '05', icon: Star, title: 'Rate & Review', desc: 'After your trip, rate your driver and leave a review. This helps keep our community safe and reliable.' },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">How It Works</h1>
        </div>

        <p className="text-[#A0A0A0] mb-8">
          WansniAuto makes inter-city travel in Morocco simple, safe, and affordable. Here's how to get started in minutes.
        </p>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1B1F27] rounded-xl p-5 border border-white/5 flex gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
                <step.icon className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[#FF6B00]/60">{step.num}</span>
                  <h3 className="text-sm font-medium text-white">{step.title}</h3>
                </div>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* For Drivers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">For Drivers</h2>
          <p className="text-sm text-[#A0A0A0] mb-4">
            Have a car and drive between cities? Turn your empty seats into income. 
            Publish your trip, set your price, and passengers will book with you.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#A0A0A0]">
            <div className="bg-[#1B1F27] rounded-lg p-3 border border-white/5">1. Verify your account</div>
            <div className="bg-[#1B1F27] rounded-lg p-3 border border-white/5">2. Publish your trip</div>
            <div className="bg-[#1B1F27] rounded-lg p-3 border border-white/5">3. Earn on every ride</div>
          </div>
          <Link to="/register" className="inline-block mt-4 text-sm text-[#FF6B00] hover:underline">Register as a driver →</Link>
        </motion.div>
      </div>
    </div>
  );
}
