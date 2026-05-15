import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { MOCK_TRIPS } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Car, Clock, Star, Wallet, Shield } from 'lucide-react';

export function PassengerDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'favorites'>('upcoming');
  const upcomingTrips = MOCK_TRIPS.filter(t => t.status === 'upcoming').slice(0, 4);

  const stats = [
    { label: 'Trips', value: user?.trips_count || 0, icon: Car },
    { label: 'Rating', value: user?.rating || 5, icon: Star, suffix: '/5' },
    { label: 'Saved', value: '1,240', icon: Wallet, prefix: 'MAD' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src={user?.avatar || '/images/avatar-passenger-1.jpg'} alt={user?.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/30" />
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name || 'Passenger'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="text-xs text-[#FF6B00]">{user?.is_verified ? 'Verified' : 'Unverified'}</span>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/search')} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl"><Car className="w-4 h-4 mr-2" /> Book a Ride</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">{s.prefix}{s.value}{s.suffix}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            {(['upcoming', 'past', 'favorites'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3.5 text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'}`}>{tab}</button>
            ))}
          </div>
          <div className="p-4">
            {activeTab === 'upcoming' && (
              <div className="space-y-2">
                {upcomingTrips.length > 0 ? upcomingTrips.map((trip, i) => (
                  <motion.div key={trip.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} onClick={() => navigate(`/trip/${trip.id}`)} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><Car className="w-6 h-6 text-[#FF6B00]" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{trip.from_location} &rarr; {trip.to_location}</p>
                      <p className="text-xs text-[#A0A0A0]">{trip.departure_date} &middot; {trip.departure_time}</p>
                    </div>
                    <span className="text-sm font-bold text-[#FF6B00]">{trip.price} MAD</span>
                  </motion.div>
                )) : (
                  <div className="text-center py-8"><Car className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" /><p className="text-sm text-[#A0A0A0]">No upcoming trips</p>
                    <Button onClick={() => navigate('/search')} variant="outline" className="mt-3 border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm">Find a ride</Button>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'past' && <div className="text-center py-8"><Clock className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" /><p className="text-sm text-[#A0A0A0]">No past trips yet</p></div>}
            {activeTab === 'favorites' && <div className="text-center py-8"><Star className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" /><p className="text-sm text-[#A0A0A0]">No favorites yet</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
