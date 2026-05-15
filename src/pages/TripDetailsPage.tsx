import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import type { Trip } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, MapPin, Clock, Star, Check, MessageCircle, Calendar, Shield, Wifi, Usb, Music, Armchair
} from 'lucide-react';

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedTrip } = useStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    supabase
      .from('trips')
      .select('*, driver:profiles(*), vehicle:vehicles(*)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Trip load error:', error);
        } else {
          setTrip(data as Trip);
        }
        setIsLoading(false);
      });
  }, [id]);

  const handleBook = () => {
    if (!trip) return;
    setSelectedTrip(trip);
    navigate(`/booking/${trip.id}`);
  };

  const amenityIcons: Record<string, typeof Wifi> = {
    'WiFi': Wifi, 'USB Charging': Usb, 'Music': Music, 'Air Conditioning': Armchair,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Trip not found</h2>
          <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">Back to search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/search')} className="p-2 rounded-xl hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
          <h1 className="text-xl font-bold text-white">Trip Details</h1>
        </div>

        {/* Driver Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={trip.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver?.name || 'driver'}`} alt={trip.driver?.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#FF6B00]/30" />
                {(trip.driver?.is_verified) && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF6B00] rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{trip.driver?.name || 'Driver'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
                  <span className="text-sm text-white">{trip.driver?.rating || 5}</span>
                  <span className="text-sm text-[#A0A0A0]">&middot; {trip.driver?.trips_count || 0} trips</span>
                </div>
                {trip.driver?.bio && <p className="text-sm text-[#A0A0A0] mt-2 max-w-md">{trip.driver.bio}</p>}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-bold text-[#FF6B00]">{trip.price} <span className="text-base font-normal text-[#A0A0A0]">MAD</span></p>
              <p className="text-sm text-[#A0A0A0]">per seat</p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => navigate('/messages')} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-[#A0A0A0] hover:border-[#FF6B00]/30 hover:text-[#FF6B00] transition-colors"><MessageCircle className="w-4 h-4" /> Message</button>
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-[#A0A0A0] hover:border-[#FF6B00]/30 hover:text-[#FF6B00] transition-colors"><Shield className="w-4 h-4" /> View Profile</button>
          </div>
        </motion.div>

        {/* Route */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Route</h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1"><div className="w-4 h-4 rounded-full bg-[#FF6B00]" /><span className="text-2xl font-bold text-white">{trip.departure_time}</span></div>
              <p className="text-[#A0A0A0] ml-7">{trip.from_location}</p>
            </div>
            <div className="flex flex-col items-center px-4">
              <Clock className="w-5 h-5 text-[#A0A0A0]" />
              <span className="text-sm text-[#A0A0A0] mt-1">{trip.duration}</span>
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-3 mb-1"><span className="text-2xl font-bold text-white">{trip.arrival_time}</span><div className="w-4 h-4 rounded-full border-2 border-[#FF6B00]" /></div>
              <p className="text-[#A0A0A0] mr-7">{trip.to_location}</p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-[#FF6B00]" /><span className="text-sm text-white">{trip.departure_date}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#FF6B00]" /><span className="text-sm text-[#A0A0A0]">{(trip.route || []).join(' \u2192 ')}</span></div>
          </div>
        </motion.div>

        {/* Vehicle & Amenities */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4">Vehicle & Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {(trip.amenities || []).map(a => {
              const Icon = amenityIcons[a] || Armchair;
              return <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-sm"><Icon className="w-3.5 h-3.5" />{a}</span>;
            })}
          </div>
        </motion.div>

        {/* Book Button */}
        <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto glass md:bg-transparent md:backdrop-blur-none border-t border-white/5 md:border-0 p-4 md:p-0 z-40">
          <Button onClick={handleBook} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl py-6 text-base font-semibold shadow-lg shadow-[#FF6B00]/20">
            Book {trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} &middot; {trip.price} MAD each
          </Button>
        </div>
      </div>
    </div>
  );
}
