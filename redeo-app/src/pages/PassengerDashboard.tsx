import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { Trip, Booking } from '@/types';
import {
  Car, Clock, Star, Wallet, Shield, Loader2,
  MapPin, Calendar, ChevronRight, Search, Heart,
} from 'lucide-react';

interface BookingWithTrip extends Booking {
  trip?: Trip;
}

const LOCAL_BOOKINGS_KEY = 'wansniauto_bookings';

function getLocalBookings(): BookingWithTrip[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function patchLocalBooking(id: string, patch: Partial<BookingWithTrip>) {
  try {
    const all = getLocalBookings();
    const updated = all.map((b: any) => b.id === id ? { ...b, ...patch } : b);
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updated));
  } catch {}
}

/** Check Supabase notifications and sync booking status for any pending bookings */
async function syncStatusFromNotifications(bookings: BookingWithTrip[], userId: string): Promise<BookingWithTrip[]> {
  const pending = bookings.filter(b => b.status === 'pending');
  if (!pending.length) return bookings;

  try {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('user_id', userId)
      .in('type', ['success', 'warning'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (!notifs?.length) return bookings;

    return bookings.map(booking => {
      if (booking.status !== 'pending') return booking;

      for (const notif of notifs) {
        const msg = notif.message || '';

        // Match by ||TRIP:id|| marker (new format)
        const tripMatch = msg.match(/\|\|TRIP:([a-zA-Z0-9-]+)\|\|/);
        if (tripMatch && tripMatch[1] === booking.trip_id) {
          const newStatus = notif.type === 'success' ? 'confirmed' : 'cancelled';
          patchLocalBooking(booking.id, { status: newStatus });
          return { ...booking, status: newStatus as BookingWithTrip['status'] };
        }

        // Fallback: match by trip content in message (old format without marker)
        const from = booking.trip?.from_location;
        const to = booking.trip?.to_location;
        const date = booking.trip?.departure_date;
        if (from && to && date && msg.includes(from) && msg.includes(to) && msg.includes(date)) {
          const newStatus = notif.type === 'success' ? 'confirmed' : 'cancelled';
          patchLocalBooking(booking.id, { status: newStatus });
          return { ...booking, status: newStatus as BookingWithTrip['status'] };
        }
      }

      return booking;
    });
  } catch {
    return bookings;
  }
}

export function PassengerDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'favorites'>('upcoming');
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalTrips, setTotalTrips] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [rating, setRating] = useState(0);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Load from localStorage (primary — bookings table may not exist in Supabase)
      let allBookings: BookingWithTrip[] = getLocalBookings().filter(
        (b: BookingWithTrip) => b.passenger_id === user.id
      );

      // Try to enrich with trip data for any booking missing it
      const needsTrip = allBookings.filter(b => !b.trip?.from_location && b.trip_id);
      if (needsTrip.length) {
        const tripIds = [...new Set(needsTrip.map(b => b.trip_id))];
        const { data: trips } = await supabase
          .from('trips')
          .select('id, from_location, to_location, departure_date, departure_time, price, driver_id')
          .in('id', tripIds);

        if (trips?.length) {
          const tripMap = new Map(trips.map(t => [t.id, t]));
          allBookings = allBookings.map(b => {
            if (!b.trip?.from_location && tripMap.has(b.trip_id)) {
              const t = tripMap.get(b.trip_id);
              return { ...b, trip: t as unknown as Trip };
            }
            return b;
          });
        }
      }

      // Sync status from Supabase notifications (driver accepted/rejected)
      allBookings = await syncStatusFromNotifications(allBookings, user.id);

      setBookings(allBookings);

      const confirmedBookings = allBookings.filter((b: BookingWithTrip) => b.status === 'confirmed');
      const totalSpent = confirmedBookings.reduce((sum: number, b: BookingWithTrip) => sum + (b.total_price || 0), 0);
      setTotalTrips(confirmedBookings.length);
      setTotalSaved(totalSpent);
      setRating(user?.rating || 5);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.rating]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Re-read when NotificationListener updates a booking status
  useEffect(() => {
    const onUpdate = () => loadBookings();
    window.addEventListener('wansniauto:booking-updated', onUpdate);
    const onVisible = () => { if (document.visibilityState === 'visible') loadBookings(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('wansniauto:booking-updated', onUpdate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadBookings]);

  const now = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => b.trip && b.trip.departure_date >= now && b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => !b.trip || b.trip.departure_date < now || b.status === 'cancelled');

  const stats = [
    { label: t('passenger.trips'), value: totalTrips, icon: Car },
    { label: t('trip.rating'), value: rating, icon: Star, suffix: '/5' },
    { label: t('passenger.spent'), value: totalSaved, icon: Wallet, prefix: 'MAD ' },
  ];

  const renderBookingItem = (booking: BookingWithTrip, index: number) => {
    const trip = booking.trip;
    if (!trip) return null;

    return (
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => navigate(`/trip/${booking.trip_id}`)}
        className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-[#FF6B00]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
            <p className="text-sm font-medium text-white truncate">
              {trip.from_location} &rarr; {trip.to_location}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
              <Calendar className="w-3 h-3" />{trip.departure_date}
            </span>
            <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
              <Clock className="w-3 h-3" />{(trip as any).departure_time}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[#FF6B00]">{booking.total_price} MAD</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            booking.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
            booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-red-500/10 text-red-400'
          }`}>{booking.status}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id || 'guest')}`}
              alt={user?.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
            />
            <div>
              <h1 className="text-2xl font-bold text-white" dir={dir}>{t('passenger.title')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="text-xs text-[#FF6B00]">{user?.is_verified ? t('profile.verified') : t('profile.unverified')}</span>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/search')} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl">
            <Search className="w-4 h-4 mr-2" /> {t('passenger.book_ride')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">{(s as any).prefix}{s.value}{(s as any).suffix}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            {([
              { key: 'upcoming' as const, label: t('passenger.upcoming') },
              { key: 'past' as const, label: t('passenger.past') },
              { key: 'favorites' as const, label: t('passenger.favorites') },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3.5 text-sm font-medium transition-colors ${activeTab === tab.key ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'}`}>
                {tab.label}
                {tab.key === 'upcoming' && upcomingBookings.length > 0 && (
                  <span className="ml-1.5 text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-1.5 py-0.5 rounded-full">{upcomingBookings.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
                <p className="text-sm text-[#A0A0A0] mt-2">{t('common.loading')}</p>
              </div>
            )}

            {!loading && activeTab === 'upcoming' && (
              <div className="space-y-2">
                {upcomingBookings.length > 0 ? upcomingBookings.map((b, i) => renderBookingItem(b, i)) : (
                  <div className="text-center py-8">
                    <Car className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                    <p className="text-sm text-[#A0A0A0] mb-1">{t('passenger.no_upcoming')}</p>
                    <p className="text-xs text-[#A0A0A0] mb-3">Book your first ride to get started!</p>
                    <Button onClick={() => navigate('/search')} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm">
                      {t('passenger.find_ride')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === 'past' && (
              <div className="space-y-2">
                {pastBookings.length > 0 ? pastBookings.map((b, i) => renderBookingItem(b, i)) : (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                    <p className="text-sm text-[#A0A0A0]">{t('passenger.no_past')}</p>
                  </div>
                )}
              </div>
            )}

            {!loading && activeTab === 'favorites' && (
              <div className="text-center py-8">
                <Heart className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                <p className="text-sm text-[#A0A0A0]">{t('common.favorite_routes')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('nav.profile'), icon: '🚗', action: () => navigate('/profile') },
            { label: t('nav.chat'), icon: '💬', action: () => navigate('/messages') },
            { label: t('verify.title'), icon: '✓', action: () => navigate('/verification') },
            { label: t('common.support'), icon: '♣', action: () => navigate('/messages') },
          ].map(item => (
            <button key={item.label} onClick={item.action} className="bg-[#1B1F27] rounded-xl border border-white/5 p-4 text-center hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/20 transition-all group">
              <p className="text-sm font-medium text-white group-hover:text-[#FF6B00] transition-colors">{item.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
