import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Car, Users, Shield, MapPin, CreditCard, Leaf, Heart } from 'lucide-react';

const VALUES = [
  { icon: Shield, title: 'Safety First', desc: 'Every driver is verified with ID, license, and background checks. Real-time trip tracking keeps you secure.' },
  { icon: CreditCard, title: 'Fair Pricing', desc: 'Transparent pricing with no hidden fees. Pay only what you see before booking.' },
  { icon: Leaf, title: 'Eco-Friendly', desc: 'By sharing rides, we reduce CO2 emissions and traffic congestion across Moroccan cities.' },
  { icon: Heart, title: 'Community', desc: 'Built for Moroccans, by Moroccans. We believe in trust, respect, and helping each other travel better.' },
];

const STATS = [
  { value: '1M+', label: 'Users' },
  { value: '500K+', label: 'Trips' },
  { value: '13', label: 'Cities' },
  { value: '4.8', label: 'Rating' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">About WansniAuto</h1>
        </div>

        {/* Hero Image */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden mb-8">
          <img src="/images/about-hero.jpg" alt="WansniAuto" className="w-full h-56 sm:h-72 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent" />
        </motion.div>

        {/* Story */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Our Story</h2>
          <p className="text-[#A0A0A0] leading-relaxed mb-4">
            WansniAuto was born in 2024 from a simple idea: why should traveling between Moroccan cities be expensive, uncomfortable, or unreliable? 
            We watched friends struggle to find rides home during holidays, students pay too much for inter-city travel, and daily commuters drive alone for hours.
          </p>
          <p className="text-[#A0A0A0] leading-relaxed">
            So we built a platform that connects drivers with empty seats to passengers heading the same way. 
            It's ride-sharing made simple, safe, and affordable — designed specifically for Morocco's unique travel culture.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-bold text-[#FF6B00]">{s.value}</p>
              <p className="text-xs text-[#A0A0A0] mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Values */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-semibold text-white mb-4">Our Values</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-[#1B1F27] rounded-xl p-4 border border-white/5">
                <v.icon className="w-6 h-6 text-[#FF6B00] mb-3" />
                <h3 className="text-sm font-medium text-white mb-1">{v.title}</h3>
                <p className="text-xs text-[#A0A0A0] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mission */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-10 bg-gradient-to-r from-[#FF6B00]/10 to-transparent rounded-2xl border border-[#FF6B00]/20 p-6 text-center">
          <Car className="w-10 h-10 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Our Mission</h2>
          <p className="text-sm text-[#A0A0A0] max-w-lg mx-auto">
            To make inter-city travel in Morocco affordable, safe, and community-driven — while reducing our environmental footprint one shared ride at a time.
          </p>
        </motion.div>

        {/* Team note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#A0A0A0]/50">
            WansniAuto is proudly built in Morocco. 
            <Link to="/careers" className="text-[#FF6B00] hover:underline ml-1">Join our team →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
