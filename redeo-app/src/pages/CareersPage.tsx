import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, MapPin } from 'lucide-react';

const POSITIONS = [
  { title: 'Backend Developer', location: 'Casablanca / Remote', type: 'Full-time', desc: 'Build and maintain our core APIs, real-time systems, and payment infrastructure using Node.js and PostgreSQL.' },
  { title: 'Community Manager', location: 'Casablanca', type: 'Full-time', desc: 'Grow our driver and passenger community, manage social media, and organize local events across Morocco.' },
  { title: 'Customer Support Specialist', location: 'Remote', type: 'Full-time', desc: 'Help our users via chat and email, resolve disputes, and ensure every trip ends with a smile.' },
  { title: 'UX/UI Designer', location: 'Casablanca / Remote', type: 'Contract', desc: 'Design beautiful, accessible interfaces for our mobile and web platforms used by millions.' },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Careers</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Briefcase className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-white mb-2">Join the WansniAuto Team</h2>
          <p className="text-sm text-[#A0A0A0] max-w-md mx-auto">
            We're building the future of transportation in Morocco. Come shape it with us.
          </p>
        </motion.div>

        <div className="space-y-3">
          {POSITIONS.map((job, i) => (
            <motion.div
              key={job.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1B1F27] rounded-xl p-5 border border-white/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-white">{job.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] w-fit">{job.type}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#A0A0A0] mb-2">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
              </div>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">{job.desc}</p>
              <a
                href="mailto:careers@wansniauto.ma?subject=Application for {job.title}"
                className="inline-block mt-3 text-xs text-[#FF6B00] hover:underline"
              >
                Apply now →
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[#A0A0A0]/50">
            Don't see your role? Send us your CV at <a href="mailto:careers@wansniauto.ma" className="text-[#FF6B00]">careers@wansniauto.ma</a>
          </p>
        </div>
      </div>
    </div>
  );
}
