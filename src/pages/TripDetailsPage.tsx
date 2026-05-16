import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { Trip, User } from '@/types';
import {
  ArrowLeft, MapPin, Clock, Star, Check, MessageCircle, Calendar,
  Wifi, Usb, Music, Armchair, Loader2, ShieldCheck,
  Users,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  phone: string;
  is_verified: boolean;
  verification_status: string;
  rating: number;
  trips_count: number;
  role: string;
}

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedTrip } = useStore();
  const { t, dir } = useI18n();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Fetch driver profile directly from Supabase ───
  const fetchDriverProfile = useCallback(async (driverId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,avatar,bio,phone,is_verified,verification_status,rating,trips_count,role&id=eq.${driverId}&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${jwt}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setDriverProfile(data[0] as DriverProfile);
          return data[0] as DriverProfile;
        }
      }
    } catch (err) {
      console.error('[TripDetails] Driver fetch error:', err);
    }
    return null;
  }, []);

  // ─── Load trip + driver ───
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    const loadTrip = async () => {
      let foundTrip: Trip | null = null;

      // 1. Try Supabase REST API
      try {
        const data = await apiGet('trips', { eq: { id } });
        if (data && data[0]) {
          foundTrip = data[0] as Trip;
        }
      } catch {
        console.log('REST API failed, trying localStorage');
      }

      // 2. Fallback: search localStorage
      if (!foundTrip) {
        try {
          const localTrips = JSON.parse(localStorage.getItem('wansniauto_trips') || '[]') as Trip[];
          foundTrip = localTrips.find((t: Trip) => t.id === id) || null;
        } catch { /* silent */ }
      }

      if (foundTrip) {
        setTrip(foundTrip);
        setSelectedTrip(foundTrip);

        // Fetch driver profile
        if (foundTrip.driver_id) {
          const profile = await fetchDriverProfile(foundTrip.driver_id);
          if (profile) {
            setTrip(prev => prev ? {
              ...prev,
              driver: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                avatar: profile.avatar,
                role: 'driver' as const,
                is_verified: profile.is_verified,
                verification_status: (profile.verification_status || 'unverified') as User['verification_status'],
                rating: profile.rating,
                trips_count: profile.trips_count,
                bio: profile.bio,
              }
            } : null);
          }
        }
      }

      setIsLoading(false);
    };

    loadTrip();
  }, [id, fetchDriverProfile, setSelectedTrip]);

  const handleBook = () => {
    if (!trip) return;
    setSelectedTrip(trip);
    navigate(`/booking/${trip.id}`);
  };

  const handleContactDriver = () => {
    if (!trip?.driver_id) return;
    const driver = trip.driver || driverProfile;
    navigate('/messages', {
      state: {
        contactId: trip.driver_id,
        contactName: driver?.name || t('trip.driver'),
        contactAvatar: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver_id}`,
      }
    });
  };

  const handleViewDriverProfile = () => {
    if (!trip?.driver_id) return;
    navigate(`/profile/${trip.driver_id}`);
  };

  const amenityIcons: Record<string, typeof Wifi> = {
    'WiFi': Wifi, 'USB Charging': Usb, 'Music': Music, 'Air Conditioning': Armchair,
  };

  const driver = trip?.driver || driverProfile;

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
          <h2 className="text-xl text-white mb-4" dir={dir}>{t('search.no_rides')}</h2>
          <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">{t('landing.search_btn')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/search')} className="p-2 rounded-xl hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
          <h1 className="text-xl font-bold text-white" dir={dir}>{trip.from_location} &rarr; {trip.to_location}</h1>
        </div>

        {/* Driver Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={handleViewDriverProfile}>
                <img
                  src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver_id}`}
                  alt={driver?.name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
                />
                {(driver?.is_verified) && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-lg font-semibold text-white cursor-pointer hover:text-[#FF6B00] transition-colors"
                    onClick={handleViewDriverProfile}
                  >
                    {driver?.name || t('trip.driver')}
                  </h2>
                  {driver?.is_verified && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-[#FF6B00] fill-[#FF6B00]" />
                  <span className="text-sm text-white">{driver?.rating || 5}</span>
                  <span className="text-sm text-[#A0A0A0]">&middot; {driver?.trips_count || 0} {t('trip.trips_done')}</span>
                </div>
                {driver?.bio && (
                  <p className="text-sm text-[#A0A0A0] mt-2 max-w-md">{driver.bio}</p>
                )}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-bold text-[#FF6B00]">{trip.price} <span className="text-base font-normal text-[#A0A0A0]">MAD</span></p>
              <p className="text-sm text-[#A0A0A0]">{t('trip.price')}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleContactDriver} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] text-white text-sm font-medium hover:bg-[#E56000] transition-colors">
              <MessageCircle className="w-4 h-4" /> Contact Driver
            </button>
            <button onClick={handleViewDriverProfile} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-[#A0A0A0] hover:bg-white/5 transition-colors">
              <Users className="w-4 h-4" /> View Profile
            </button>
          </div>
        </motion.div>

        {/* Route */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4" dir={dir}>{t('trip.route')}</h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1"><div className="w-4 h-4 rounded-full bg-[#FF6B00]" /><span className="text-2xl font-bold text-white">{trip.departure_time}</span></div>
              <p className="text-[#A0A0A0] ml-7">{trip.from_location}</p>
            </div>
            <div className="flex flex-col items-center px-4">
              <Clock className="w-5 h-5 text-[#A0A0A0]" />
              <span className="text-sm text-[#A0A0A0] mt-1">{trip.duration || '—'}</span>
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-3 mb-1"><span className="text-2xl font-bold text-white">{trip.arrival_time || '—'}</span><div className="w-4 h-4 rounded-full border-2 border-[#FF6B00]" /></div>
              <p className="text-[#A0A0A0] mr-7">{trip.to_location}</p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-[#FF6B00]" /><span className="text-sm text-white">{trip.departure_date}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#FF6B00]" /><span className="text-sm text-[#A0A0A0]">{(trip.route || []).join(' \u2192 ')}</span></div>
          </div>
        </motion.div>

        {/* Seats & Distance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{trip.available_seats}</p>
              <p className="text-xs text-[#A0A0A0]">{t('trip.seats_left')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{trip.total_seats}</p>
              <p className="text-xs text-[#A0A0A0]">{t('driver.seats')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{trip.distance || '—'}</p>
              <p className="text-xs text-[#A0A0A0]">{t('driver.distance')}</p>
            </div>
          </div>
        </motion.div>

        {/* Vehicle & Amenities */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6 mb-5">
          <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider mb-4" dir={dir}>{t('trip.amenities')}</h3>
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
            {t('trip.book_now')} &middot; {trip.price} MAD / {t('trip.price')}
          </Button>
        </div>
      </div>
    </div>
  );
}
