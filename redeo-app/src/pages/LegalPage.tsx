import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Cookie, Car } from 'lucide-react';

const TABS = [
  { id: 'terms', label: 'Terms', icon: FileText },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'cookies', label: 'Cookies', icon: Cookie },
  { id: 'driver', label: 'Drivers', icon: Car },
];

const CONTENT: Record<string, { title: string; body: React.ReactNode }> = {
  terms: {
    title: 'Terms & Conditions',
    body: (
      <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
        <p>Welcome to WansniAuto. By using our platform, you agree to these Terms & Conditions. Please read them carefully before booking or publishing trips.</p>

        <h3 className="text-white font-medium mt-4">1. Definitions</h3>
        <p>"Platform" refers to the WansniAuto website and mobile applications. "User" means any person who accesses the Platform, whether as a passenger or driver. "Trip" means a shared ride published by a driver and booked by a passenger(s).</p>

        <h3 className="text-white font-medium mt-4">2. Eligibility</h3>
        <p>You must be at least 18 years old to use WansniAuto. Drivers must hold a valid Moroccan driving license, valid vehicle registration, and valid insurance. All users must provide accurate, current, and complete information during registration.</p>

        <h3 className="text-white font-medium mt-4">3. User Responsibilities</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Provide accurate personal information and keep it updated</li>
          <li>Respect other users and maintain appropriate behavior during trips</li>
          <li>Arrive on time at the agreed pickup location</li>
          <li>Comply with all Moroccan traffic laws and regulations</li>
          <li>Not use the platform for illegal activities or commercial transportation without authorization</li>
        </ul>

        <h3 className="text-white font-medium mt-4">4. Driver Requirements</h3>
        <p>Drivers must: (a) have a valid driving license, (b) own or have authorization to use the registered vehicle, (c) maintain valid insurance, (d) ensure the vehicle is roadworthy and safe, (e) undergo and pass our verification process, (f) not exceed vehicle capacity limits.</p>

        <h3 className="text-white font-medium mt-4">5. Payments & Fees</h3>
        <p>Trip prices are set by drivers. WansniAuto charges a 5% service fee on each booking. All payments are processed securely. Refunds are issued based on our cancellation policy: full refund for cancellations 2+ hours before departure; partial refund for late cancellations; no refund for no-shows.</p>

        <h3 className="text-white font-medium mt-4">6. Cancellations</h3>
        <p>Passengers may cancel through the app. Drivers may cancel emergencies only — frequent cancellations result in account penalties. If a driver cancels, the passenger receives a full refund automatically.</p>

        <h3 className="text-white font-medium mt-4">7. Liability</h3>
        <p>WansniAuto is a platform connecting independent drivers and passengers. We do not own vehicles or employ drivers. Users acknowledge that travel involves risks and agree that WansniAuto is not liable for incidents arising during trips, except where caused by our gross negligence.</p>

        <h3 className="text-white font-medium mt-4">8. Account Termination</h3>
        <p>We may suspend or terminate accounts for: fraud, abuse, safety violations, repeated cancellations, providing false information, or illegal activity. Users may delete their account at any time through Settings.</p>

        <h3 className="text-white font-medium mt-4">9. Changes to Terms</h3>
        <p>We may update these terms periodically. Continued use after changes constitutes acceptance. Last updated: May 2026.</p>

        <p className="text-xs text-[#A0A0A0]/50 mt-6">If you have questions, contact us at support@wansniauto.ma</p>
      </div>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
        <p>WansniAuto is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal data in compliance with Moroccan Law 09-08 on the Protection of Personal Data.</p>

        <h3 className="text-white font-medium mt-4">1. Data We Collect</h3>
        <p>We collect: (a) Identity data — name, email, phone, profile photo; (b) Verification data (drivers only) — CIN, license, registration, insurance, selfie; (c) Trip data — routes, bookings, cancellations; (d) Payment data — processed securely by our payment partners; (e) Technical data — IP address, device info, app usage; (f) Communication data — in-app messages.</p>

        <h3 className="text-white font-medium mt-4">2. How We Use Your Data</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Provide and improve our ride-sharing services</li>
          <li>Verify driver identities and vehicle documentation</li>
          <li>Process payments and handle refunds</li>
          <li>Send booking confirmations and trip updates</li>
          <li>Ensure platform safety and investigate disputes</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h3 className="text-white font-medium mt-4">3. Data Sharing</h3>
        <p>We share limited data between users for trip coordination (name, phone upon booking confirmation, vehicle details). We share data with: payment processors (for transactions), verification services (for identity checks), and authorities (when legally required). We never sell your personal data to advertisers.</p>

        <h3 className="text-white font-medium mt-4">4. Data Security</h3>
        <p>We use industry-standard encryption (TLS 1.3), secure servers, and regular security audits. Access to personal data is restricted to authorized personnel only. However, no internet transmission is 100% secure.</p>

        <h3 className="text-white font-medium mt-4">5. Your Rights</h3>
        <p>Under Moroccan law, you have the right to: access your data, correct inaccurate data, request deletion (with limitations for legal compliance), object to processing, and withdraw consent. Contact us to exercise these rights.</p>

        <h3 className="text-white font-medium mt-4">6. Data Retention</h3>
        <p>We retain account data while your account is active. Trip and payment data are retained for 5 years for legal and tax purposes. Deleted accounts are anonymized within 30 days, except where retention is legally required.</p>

        <h3 className="text-white font-medium mt-4">7. Cookies</h3>
        <p>We use essential cookies for platform functionality and analytics cookies to improve user experience. You can manage cookie preferences through your browser settings. See our Cookie Policy for details.</p>

        <h3 className="text-white font-medium mt-4">8. Contact</h3>
        <p>For privacy questions or data requests, email us at privacy@wansniauto.ma or through our <Link to="/support" className="text-[#FF6B00] hover:underline">support page</Link>.</p>

        <p className="text-xs text-[#A0A0A0]/50 mt-6">Last updated: May 2026</p>
      </div>
    ),
  },
  cookies: {
    title: 'Cookie Policy',
    body: (
      <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
        <p>This Cookie Policy explains how WansniAuto uses cookies and similar technologies when you visit our website and use our services.</p>

        <h3 className="text-white font-medium mt-4">1. What Are Cookies</h3>
        <p>Cookies are small text files stored on your device when you visit a website. They help websites function properly, improve user experience, and provide analytical information.</p>

        <h3 className="text-white font-medium mt-4">2. Types of Cookies We Use</h3>
        <p><strong className="text-white">Essential Cookies:</strong> Required for basic platform functionality — login sessions, security, booking processes. These cannot be disabled.</p>
        <p><strong className="text-white">Analytics Cookies:</strong> Help us understand how users interact with our platform (Google Analytics). These are anonymized and help us improve features.</p>
        <p><strong className="text-white">Preference Cookies:</strong> Remember your settings such as language preference, display options, and saved passenger information.</p>

        <h3 className="text-white font-medium mt-4">3. How to Manage Cookies</h3>
        <p>You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. Note that disabling essential cookies may prevent the platform from functioning correctly.</p>

        <h3 className="text-white font-medium mt-4">4. Third-Party Services</h3>
        <p>We use Google Analytics for usage statistics. Their cookies collect anonymized data about page visits and feature usage. We do not use cookies for advertising or tracking across other websites.</p>

        <h3 className="text-white font-medium mt-4">5. Changes to This Policy</h3>
        <p>We may update this Cookie Policy as our services evolve. We will notify users of significant changes via email or platform notifications.</p>

        <p className="text-xs text-[#A0A0A0]/50 mt-6">Last updated: May 2026</p>
      </div>
    ),
  },
  driver: {
    title: 'Driver Agreement',
    body: (
      <div className="space-y-4 text-sm text-[#A0A0A0] leading-relaxed">
        <p>This Driver Agreement outlines the terms specific to drivers using the WansniAuto platform. By publishing trips and accepting bookings, you agree to these terms.</p>

        <h3 className="text-white font-medium mt-4">1. Independent Contractor Status</h3>
        <p>You are an independent contractor, not an employee of WansniAuto. You control your schedule, routes, and pricing. You are responsible for your own taxes, insurance, and vehicle maintenance.</p>

        <h3 className="text-white font-medium mt-4">2. Vehicle Requirements</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Vehicle must be registered in Morocco and roadworthy</li>
          <li>Valid insurance covering passenger transport</li>
          <li>Vehicle age not exceeding 15 years for standard cars</li>
          <li>Clean, safe, and well-maintained condition</li>
          <li>Air conditioning recommended for long-distance trips</li>
        </ul>

        <h3 className="text-white font-medium mt-4">3. Driver Conduct</h3>
        <p>Drivers must: (a) arrive on time at pickup locations, (b) communicate clearly with passengers, (c) drive safely and obey traffic laws, (d) maintain a respectful environment, (e) not discriminate against passengers, (f) not use the platform for commercial taxi services.</p>

        <h3 className="text-white font-medium mt-4">4. Pricing & Payments</h3>
        <p>You set your own trip prices. WansniAuto deducts a 5% service fee from each booking. Payments are transferred to your registered bank account within 3-5 business days after trip completion. You are responsible for declaring income according to Moroccan tax laws.</p>

        <h3 className="text-white font-medium mt-4">5. Cancellation Policy</h3>
        <p>Drivers should avoid cancellations. Emergency cancellations must be reported immediately. Frequent cancellations result in: warning → temporary suspension → permanent account ban. Drivers who cancel less than 2 hours before departure may face penalties.</p>

        <h3 className="text-white font-medium mt-4">6. Passenger Safety</h3>
        <p>You are responsible for passenger safety during the trip. This includes: safe driving, working seatbelts for all passengers, respecting traffic laws, and maintaining appropriate behavior. Any accident must be reported to WansniAuto within 24 hours.</p>

        <h3 className="text-white font-medium mt-4">7. Document Verification</h3>
        <p>You must keep all uploaded documents current. Expired documents result in account suspension until renewal. We conduct random re-verification checks to ensure continued compliance.</p>

        <h3 className="text-white font-medium mt-4">8. Rating System</h3>
        <p>Maintaining a rating above 4.0 is required to remain active. Consistently low ratings trigger a review process. Drivers may appeal unfair ratings through support.</p>

        <h3 className="text-white font-medium mt-4">9. Termination</h3>
        <p>Either party may terminate this agreement at any time. WansniAuto may terminate for: fraud, safety violations, document expiry, illegal activity, or repeated policy violations. You may delete your driver account through Settings.</p>

        <p className="text-xs text-[#A0A0A0]/50 mt-6">Last updated: May 2026</p>
      </div>
    ),
  },
};

export default function LegalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'terms';
  const content = CONTENT[activeTab] || CONTENT.terms;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Legal</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20'
                    : 'bg-[#1B1F27] text-[#A0A0A0] border border-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">{content.title}</h2>
          {content.body}
        </motion.div>
      </div>
    </div>
  );
}
