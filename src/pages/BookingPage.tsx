import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Trip, User } from '@/types';
import {
  ArrowLeft, CheckCircle, Loader2, CreditCard,
  MapPin, Clock, Calendar, Star, ShieldCheck, Leaf,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

export function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [seats, setSeats] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  /* ─── Load trip + driver ─── */
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData.session?.access_token || '';

        // Fetch trip
        const tripRes = await fetch(
          `${SUPABASE_URL}/rest/v1/trips?select=*&id=eq.${id}&limit=1`,
          { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
        );
        if (tripRes.ok) {
          const trips = await tripRes.json();
          if (trips?.[0]) {
            const t = trips[0];
            setTrip(t);
            // Fetch driver
            const driverRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${t.driver_id}&limit=1`,
              { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
            );
            if (driverRes.ok) {
              const drivers = await driverRes.json();
              if (drivers?.[0]) {
                setDriver(drivers[0]);
                setTrip(prev => prev ? { ...prev, driver: drivers[0] } : null);
              }
            }
          }
        }
      } catch (e) { console.error('load error:', e); }
      setIsLoading(false);
    };
    load();
  }, [id]);

  /* ─── Handle booking ─── */
  const handleBook = async () => {
    if (!trip || !user) { toast.error('Login required'); return; }
    if (seats > (trip.available_seats || 0)) { toast.error('Not enough seats'); return; }

    setIsBooking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';

      const bookingData = {
        trip_id: trip.id,
        passenger_id: user.id,
        driver_id: trip.driver_id,
        seats,
        status: 'pending',
        total_price: trip.price * seats,
        passenger_name: user.name,
        passenger_phone: user.phone,
        created_at: new Date().toISOString(),
      };

      // Try Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!res.ok) {
        console.warn('Supabase booking failed, using localStorage');
      }

      // Always save locally
      const localBookings = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
      localBookings.push({ ...bookingData, id: `local-${Date.now()}` });
      localStorage.setItem('wansniauto_bookings', JSON.stringify(localBookings));

      toast.success(`Booking request sent for ${seats} seat(s)!`);
      setBooked(true);
    } catch (e) {
      toast.error('Booking failed');
    }
    setIsBooking(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <p className="text-[#A0A0A0]">Trip not found</p>
      </div>
    );
  }

  /* ─── Success view ─── */
  if (booked) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Booking Request Sent!</h2>
          <p className="text-sm text-[#A0A0A0] mb-2">Your driver will review and confirm your booking.</p>
          <div className="bg-[#1B1F27] rounded-xl p-4 border border-white/5 mb-6 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A0A0A0]">Trip</span>
              <span className="text-sm text-white font-medium">{trip.from_location} → {trip.to_location}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A0A0A0]">Seats</span>
              <span className="text-sm text-white font-medium">{seats}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#A0A0A0]">Total</span>
              <span className="text-sm text-[#FF6B00] font-bold">{trip.price * seats} MAD</span>
            </div>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate(`/trip/${trip.id}`)} className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-12">Back to Trip</Button>
            <Button onClick={() => navigate('/my-trips')} variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 rounded-xl h-12">My Bookings</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(`/trip/${id}`)} className="p-2 rounded-xl hover:bg-white/5"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
          <h1 className="text-xl font-bold text-white">Book This Ride</h1>
        </div>

        {/* Trip Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-[#FF6B00]" /><span className="text-sm text-white font-medium">{trip.from_location} → {trip.to_location}</span></div>
              <div className="flex items-center gap-3 text-xs text-[#A0A0A0]">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.departure_date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{trip.departure_time}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.name}`} alt="" className="w-10 h-10 rounded-full ring-2 ring-[#FF6B00]/20" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{driver?.name || 'Driver'}</p>
                {driver?.is_verified && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400"><ShieldCheck className="w-3 h-3" /> Verified</span>}
              </div>
              <div className="flex items-center gap-1"><Star className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" /><span className="text-xs text-[#A0A0A0]">{driver?.rating || 5} ({driver?.trips_count || 0} trips)</span></div>
            </div>
          </div>
        </motion.div>

        {/* Seats Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-5">
          <p className="text-sm font-medium text-white mb-3">How many seats?</p>
          <div className="flex items-center gap-3">
            {[1,2,3,4].map(n => (
              <button
                key={n}
                onClick={() => setSeats(n)}
                disabled={n > (trip.available_seats || 0)}
                className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                  seats === n ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00] font-bold' :
                  n > (trip.available_seats || 0) ? 'border-white/5 text-[#A0A0A0]/30 cursor-not-allowed' :
                  'border-white/10 text-white hover:border-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#A0A0A0] mt-2">{trip.available_seats || 0} seats available</p>
        </motion.div>

        {/* CO2 Saving */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-green-500/5 rounded-2xl border border-green-500/10 p-4 mb-5 flex items-center gap-3">
          <Leaf className="w-6 h-6 text-green-400" />
          <div>
            <p className="text-sm text-green-400 font-medium">Save ~{(seats * 12)}kg CO2</p>
            <p className="text-xs text-[#A0A0A0]">By sharing this ride, you reduce your carbon footprint.</p>
          </div>
        </motion.div>

        {/* Price Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A0A0A0]">{seats} seat(s) × {trip.price} MAD</span>
            <span className="text-white">{seats * trip.price} MAD</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#A0A0A0]">Service fee</span>
            <span className="text-white">{Math.round(seats * trip.price * 0.05)} MAD</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Total</span>
            <span className="text-xl font-bold text-[#FF6B00]">{seats * trip.price + Math.round(seats * trip.price * 0.05)} MAD</span>
          </div>
        </motion.div>

        {/* Book Button */}
        <Button
          onClick={handleBook}
          disabled={isBooking || seats > (trip.available_seats || 0)}
          className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-13 text-base font-semibold shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50 mb-3"
        >
          {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5 mr-2" /> Request Booking</>}
        </Button>

        <Button onClick={() => navigate(`/trip/${id}`)} variant="outline" className="w-full border-white/10 text-[#A0A0A0] hover:bg-white/5 rounded-xl h-12">
          Cancel
        </Button>
      </div>
    </div>
  );
}
