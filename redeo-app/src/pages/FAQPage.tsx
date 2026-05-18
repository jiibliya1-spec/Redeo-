import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'How do I book a ride?', a: 'Search for your route by entering departure city, destination, and travel date. Browse available drivers, compare prices and ratings, then tap "Book" to reserve your seat. Payment is processed securely through the app.' },
  { q: 'How do I become a driver?', a: 'Register as a driver, complete verification by uploading your CIN, driving license, vehicle registration, insurance, and a selfie. Our team reviews documents within 24-48 hours. Once verified, you can publish trips and start earning.' },
  { q: 'Is my payment secure?', a: 'Yes. All payments are processed through encrypted channels compliant with PCI-DSS standards. Your money is held securely and only released to the driver after the trip is completed successfully.' },
  { q: 'How do I cancel a booking?', a: 'Go to "My Trips", find your upcoming booking, and tap "Cancel". Cancellations made more than 2 hours before departure receive a full refund. Late cancellations may incur a small fee.' },
  { q: 'What happens if my driver cancels?', a: 'If your driver cancels, you receive an immediate full refund and a notification. You can then book another available ride for the same route. We also track driver cancellation rates to maintain platform quality.' },
  { q: 'How does driver verification work?', a: 'Drivers must upload: (1) Valid National ID (CIN), (2) Driving license, (3) Vehicle registration, (4) Insurance certificate, (5) Real-time selfie. Our admin team verifies each document manually within 24-48 hours.' },
  { q: 'Can I bring luggage?', a: 'Yes, standard luggage is included. During booking, you can specify if you have large luggage. Drivers see this information and can confirm if their vehicle has space. Extra-large items may require booking an additional seat.' },
  { q: 'What cities does WansniAuto cover?', a: 'We currently operate across 13+ major Moroccan cities including Casablanca, Rabat, Marrakech, Fes, Tangier, Agadir, Meknes, Oujda, Kenitra, Tetouan, Safi, El Jadida, and Beni Mellal.' },
  { q: 'How are prices determined?', a: 'Drivers set their own prices based on distance, fuel costs, and demand. WansniAuto adds a small 5% service fee. You see the total price before booking — no hidden fees, no surprises.' },
  { q: 'How do I contact my driver?', a: 'Once your booking is confirmed, you can chat with your driver through the in-app messaging system. This keeps your phone number private until you choose to share it.' },
  { q: 'What if I am late to the pickup?', a: 'We recommend arriving 5 minutes early. If you are running late, message your driver immediately through the app. Drivers typically wait up to 15 minutes before marking a no-show, which may result in forfeiting your booking.' },
  { q: 'Are pets allowed?', a: 'Pet policy varies by driver. During booking, you can add a note about traveling with a pet. The driver will confirm if they are comfortable with it. We recommend bringing a carrier for small pets.' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">FAQs</h1>
        </div>

        <p className="text-sm text-[#A0A0A0] mb-6">
          Find answers to the most common questions about WansniAuto. Can't find what you're looking for? 
          <Link to="/support" className="text-[#FF6B00] hover:underline"> Contact us.</Link>
        </p>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[#1B1F27] rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm text-white font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#A0A0A0] shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-[#A0A0A0] px-4 pb-4 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
