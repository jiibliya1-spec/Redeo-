import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { Trip, User } from '@/types';
import {
  ArrowLeft, Star, CheckCircle, MessageCircle,
  Shield, Users, Loader2, Car, Leaf, AlertTriangle,
  Share2, PawPrint, Ban, Calendar, ChevronRight, Phone,
  Circle, CircleDot,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface BookingPassenger {
  name: string;
  avatar: string;
  from: string;
  to: string;
}

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: _user } = useStore();
  const { lang, dir } = useI18n();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passengers] = useState<BookingPassenger[]>([]);

  const getHeaders = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${s.session?.access_token || ''}`,
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    const load = async () => {
      // 1. Fetch trip
      try {
        const data = await apiGet('trips', { eq: { id } });
        if (data && data[0]) {
          const t = data[0] as Trip;
          setTrip(t);

          // 2. Fetch driver
          const headers = await getHeaders();
          const dres = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${t.driver_id}&limit=1`,
            { headers }
          );
          if (dres.ok) {
            const d = await dres.json();
            if (d?.[0]) {
              setDriver(d[0]);
              setTrip(prev => prev ? { ...prev, driver: d[0] } : null);
            }
          }
        }
      } catch (e) { console.error('load error:', e); }
      setIsLoading(false);
    };

    load();
  }, [id, getHeaders]);

  const handleBook = () => {
    if (!trip) return;
    navigate(`/booking/${trip.id}`);
  };

  const handleContactDriver = () => {
    if (!trip?.driver_id) return;
    navigate('/messages', {
      state: {
        contactId: trip.driver_id,
        contactName: driver?.name || 'Driver',
        contactAvatar: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver_id}`,
      }
    });
  };

  const handleViewDriver = () => {
    if (!trip?.driver_id) return;
    navigate(`/profile/${trip.driver_id}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `WansniAuto: ${trip?.from_location} → ${trip?.to_location}`,
        text: `Trip from ${trip?.from_location} to ${trip?.to_location} on ${trip?.departure_date}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const T = {
    en: {
      book_now: 'Book',
      contact: 'Contact',
      price: 'per seat',
      seats_left: 'seat(s) left',
      booking_note: 'Your booking will only be confirmed once the driver accepts your request.',
      verified: 'Verified Profile',
      no_animals: 'No pets allowed',
      co2_saved: 'By sharing this ride, you help save approx.',
      co2_note: 'of CO₂ compared to driving alone.',
      share: 'Share trip',
      report: 'Report trip',
      passengers: 'Passengers',
      vehicle: 'Vehicle',
      back: 'Back',
      departure: 'Departure',
      arrival: 'Arrival',
    },
    fr: {
      book_now: 'Réserver',
      contact: 'Contacter',
      price: 'par siège',
      seats_left: 'place(s) restante(s)',
      booking_note: 'Votre réservation ne sera confirmée que lorsque le conducteur acceptera votre demande.',
      verified: 'Profil Vérifié',
      no_animals: 'Pas d\'animaux',
      co2_saved: 'En partageant ce trajet, vous économisez environ',
      co2_note: 'de CO₂ par rapport à une conduite seul.',
      share: 'Partager',
      report: 'Signaler',
      passengers: 'Passagers',
      vehicle: 'Véhicule',
      back: 'Retour',
      departure: 'Départ',
      arrival: 'Arrivée',
    },
    ar: {
      book_now: 'احجز',
      contact: 'تواصل',
      price: 'لكرسي',
      seats_left: 'مقاعد باقية',
      booking_note: 'الحجز غادي يتأكد غير ملي السائق يقبل طلبك.',
      verified: 'بروفايل مفحوص',
      no_animals: 'ممنوع الحيوانات',
      co2_saved: 'بمشاركة هاد الرحلة، كاتوفر حوالي',
      co2_note: 'ديال CO₂ مقارنة بالسيارة فردية.',
      share: 'شارك الرحلة',
      report: 'بلّغ الرحلة',
      passengers: 'الركاب',
      vehicle: 'السيارة',
      back: 'رجوع',
      departure: 'المغادرة',
      arrival: 'الوصول',
    },
  }[lang];

  const co2Amount = Math.round((trip?.price || 0) * 12);
  const isFullyBooked = (trip?.available_seats || 0) <= 0;

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
          <h2 className="text-xl text-white mb-4" dir={dir}>Trip not found</h2>
          <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">Search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pb-8">
      {/* Top Nav */}
      <div className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-[#A0A0A0]">{trip.departure_date}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ─── TIMELINE ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          {/* Date */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#FF6B00]" />
            <span className="text-sm text-[#A0A0A0]">{trip.departure_date}</span>
          </div>

          {/* Timeline */}
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-white/10" />

            {/* Departure */}
            <div className="relative mb-6">
              <CircleDot className="absolute -left-[21px] top-0 w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
              <p className="text-2xl font-bold text-white">{trip.departure_time}</p>
              <p className="text-sm text-white font-medium">{trip.from_location}</p>
              {trip.duration && <p className="text-xs text-[#A0A0A0]">{trip.duration}</p>}
            </div>

            {/* Duration badge */}
            {trip.duration && (
              <div className="relative mb-4">
                <span className="text-xs text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-full">{trip.duration}</span>
              </div>
            )}

            {/* Arrival */}
            <div className="relative">
              <Circle className="absolute -left-[21px] top-0 w-5 h-5 text-[#FF6B00]" />
              <p className="text-2xl font-bold text-white">{trip.arrival_time || '--:--'}</p>
              <p className="text-sm text-white font-medium">{trip.to_location}</p>
            </div>
          </div>
        </motion.div>

        {/* ─── SEATS LEFT BADGE ─── */}
        {!isFullyBooked && (trip.available_seats || 0) <= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl p-3 text-center">
            <p className="text-sm text-[#FF6B00] font-medium">
              Only {trip.available_seats} {T.seats_left}!
            </p>
          </motion.div>
        )}

        {/* ─── PRICE & BOOK ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#A0A0A0]" />
              <span className="text-sm text-white">1 {T.seats_left}</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{trip.price} <span className="text-base font-normal text-[#A0A0A0]">MAD</span></p>
              <p className="text-xs text-[#A0A0A0]">{T.price}</p>
            </div>
          </div>
          <Button
            onClick={handleBook}
            disabled={isFullyBooked}
            className="w-full bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl h-12 font-semibold text-base disabled:opacity-30"
          >
            {isFullyBooked ? 'Fully Booked' : T.book_now}
          </Button>
        </motion.div>

        {/* ─── DRIVER CARD ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative cursor-pointer" onClick={handleViewDriver}>
              <img
                src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver_id}`}
                alt={driver?.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/20"
              />
              {driver?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#4A9EFF] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 cursor-pointer" onClick={handleViewDriver}>
              <p className="text-lg font-bold text-white">{driver?.name || 'Driver'}</p>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
                <span className="text-sm text-white font-medium">{driver?.rating || 5}/5</span>
                <span className="text-xs text-[#A0A0A0]">- {driver?.trips_count || 0} reviews</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#A0A0A0]" />
          </div>

          {/* Driver badges */}
          <div className="space-y-3">
            {driver?.is_verified && (
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#4A9EFF]" />
                <span className="text-sm text-white">{T.verified}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white">Never cancels rides</span>
            </div>
          </div>

          {/* Contact button */}
          <Button
            onClick={handleContactDriver}
            variant="outline"
            className="w-full mt-4 border-white/10 text-white hover:bg-white/5 rounded-xl h-11"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> {T.contact}
          </Button>
        </motion.div>

        {/* ─── BOOKING INFO ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-start gap-3 bg-[#1B1F27]/50 rounded-xl p-4 border border-white/5">
          <Phone className="w-5 h-5 text-[#A0A0A0] shrink-0 mt-0.5" />
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{T.booking_note}</p>
        </motion.div>

        {/* ─── TRIP PREFERENCES ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5 space-y-4">
          <h3 className="text-sm font-medium text-white uppercase tracking-wider">Trip Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <PawPrint className="w-5 h-5 text-red-400" />
              <span className="text-sm text-white">{T.no_animals}</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#A0A0A0]" />
              <span className="text-sm text-white">Max. 2 on the back seat</span>
            </div>
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-[#A0A0A0]" />
              <span className="text-sm text-white">{T.vehicle}: SKODA Octavia - Yellow</span>
            </div>
          </div>
        </motion.div>

        {/* ─── PASSENGERS ─── */}
        {passengers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
            <h3 className="text-lg font-bold text-white mb-4">{T.passengers}</h3>
            <div className="space-y-3">
              {passengers.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <img src={p.avatar} alt="" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm text-white font-medium">{p.name}</p>
                    <p className="text-xs text-[#A0A0A0]">{p.from} → {p.to}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── CO2 SAVING ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-5">
          <div className="flex items-start gap-3">
            <Leaf className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="text-sm text-white leading-relaxed">
                {T.co2_saved} <span className="font-bold text-green-400">~{co2Amount} kg</span> {T.co2_note}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── SHARE / REPORT ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
          <button onClick={handleShare} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors text-left">
            <Share2 className="w-5 h-5 text-[#4A9EFF]" />
            <span className="text-sm text-[#4A9EFF]">{T.share}</span>
          </button>
          <button onClick={() => {}} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors text-left">
            <AlertTriangle className="w-5 h-5 text-[#4A9EFF]" />
            <span className="text-sm text-[#4A9EFF]">{T.report}</span>
          </button>
        </motion.div>

        <div className="h-4" />
      </div>
    </div>
  );
}
