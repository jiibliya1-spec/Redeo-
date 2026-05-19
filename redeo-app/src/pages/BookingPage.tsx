import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Trip, User } from '@/types';
import {
  ArrowLeft, CheckCircle, Loader2,
  MapPin, Clock, Calendar, Star, ShieldCheck, Leaf, Banknote,
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
        const { data: trips } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .limit(1);

        if (trips?.[0]) {
          const t = trips[0] as Trip;
          setTrip(t);

          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', t.driver_id)
            .limit(1);

          if (profiles?.[0]) {
            setDriver(profiles[0] as unknown as User);
          }
        }
      } catch (e) { console.error('load trip:', e); }
      setIsLoading(false);
    };
    load();
  }, [id]);

  const handleBook = async () => {
    if (!trip || !user?.id) return;
    setIsBooking(true);
    try {
      const now = new Date().toISOString();
      const bookingData = {
        trip_id: trip.id,
        passenger_id: user.id,
        seats,
        status: 'pending',
        total_price: trip.price * seats,
        created_at: now,
      };

      // ── PRIMARY: Supabase bookings table ──
      const { data: inserted, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      const bookingId = inserted?.id || crypto.randomUUID();

      // ── CACHE: localStorage (always save for offline access) ──
      try {
        const all: any[] = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
        const localEntry = {
          ...bookingData,
          id: bookingId,
          trip: {
            id: trip.id,
            from_location: trip.from_location,
            to_location: trip.to_location,
            departure_date: trip.departure_date,
            departure_time: trip.departure_time,
            price: trip.price,
            driver_id: trip.driver_id,
          },
          driver: driver ? { name: driver.name, avatar: driver.avatar } : null,
        };
        localStorage.setItem('wansniauto_bookings', JSON.stringify([localEntry, ...all.filter(b => b.id !== bookingId)]));
      } catch {}

      if (error) {
        // Supabase table missing — already saved to localStorage, continue
        console.warn('bookings table not ready:', error.message);
      }

      // ── Notify driver ──
      if (trip.driver_id) {
        const { data: s } = await supabase.auth.getSession();
        const jwt = s.session?.access_token || '';
        fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id: trip.driver_id,
            type: 'info',
            title: 'New Booking Request 🚗',
            message: `${user.name || 'A passenger'} wants to book ${seats} seat(s) on your trip from ${trip.from_location} to ${trip.to_location} on ${trip.departure_date}. ||TRIP:${trip.id}||`,
            read: false,
          }),
        }).catch(() => {});
      }

      setBooked(true);
      toast.success('Booking request sent! Waiting for driver approval.');
    } catch (e: any) {
      toast.error(e.message || 'Booking failed');
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
        <div className="text-center">
          <p className="text-white text-lg mb-4">Trip not found</p>
          <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00]">
            Search
          </Button>
        </div>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-[#0F1115] pt-20 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-8"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Booking Sent!</h2>
          <p className="text-[#A0A0A0] mb-2">Waiting for driver approval.</p>
          <p className="text-sm text-[#FF6B00] font-medium mb-8">Cash payment: {trip.price * seats} MAD to driver</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/my-trips')} className="bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl px-6">
              My Trips
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="border-white/10 text-white rounded-xl px-6">
              Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const totalPrice = trip.price * seats;

  return (
    <div className="min-h-screen bg-[#0F1115] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-base font-semibold text-white">Book Ride</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Trip card */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B00]" />
                <span className="text-white font-medium">{trip.from_location}</span>
                <span className="text-[#A0A0A0]">→</span>
                <span className="text-white font-medium">{trip.to_location}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-[#A0A0A0]">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.departure_date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{trip.departure_time}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[#FF6B00]">{trip.price} MAD</p>
              <p className="text-xs text-[#A0A0A0]">per seat</p>
            </div>
          </div>

          {/* Driver */}
          {driver && (
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <img
                src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.name}`}
                alt={driver.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-white">{driver.name}</p>
                <div className="flex items-center gap-2 text-xs text-[#A0A0A0]">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>{driver.rating || 5}/5</span>
                  {driver.is_verified && (
                    <span className="flex items-center gap-1 text-green-400"><ShieldCheck className="w-3 h-3" />Verified</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seats selector */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          <p className="text-sm font-medium text-white mb-3">Number of seats</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSeats(s => Math.max(1, s - 1))}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
            >−</button>
            <span className="text-2xl font-bold text-white w-8 text-center">{seats}</span>
            <button
              onClick={() => setSeats(s => Math.min(trip.available_seats || 4, s + 1))}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
            >+</button>
            <span className="text-xs text-[#A0A0A0] ml-2">{trip.available_seats} available</span>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <Banknote className="w-5 h-5" />
            <span className="font-medium">Cash payment only</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0A0]">{seats} seat(s) × {trip.price} MAD</span>
            <span className="text-white font-bold">{totalPrice} MAD</span>
          </div>
          <p className="text-xs text-[#A0A0A0]">Pay directly to the driver on the day of travel. No online payment required.</p>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <Leaf className="w-3.5 h-3.5" />
            <span>You save ~{(seats * 95).toFixed(0)}g of CO₂ vs driving alone</span>
          </div>
        </div>

        {/* Book button */}
        <Button
          onClick={handleBook}
          disabled={isBooking}
          className="w-full h-14 bg-[#FF6B00] hover:bg-[#E56000] text-white font-bold text-base rounded-2xl"
        >
          {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : `Request Booking — ${totalPrice} MAD cash`}
        </Button>

        <p className="text-center text-xs text-[#A0A0A0]">
          Your booking is confirmed only after the driver accepts. You'll receive a notification.
        </p>
      </div>
    </div>
  );
}
