import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Trip, Booking } from '@/types';
import {
  Car,
  Clock,
  Star,
  Wallet,
  Shield,
  Loader2,
  MapPin,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface BookingWithTrip extends Booking {
  trip?: Trip;
}

export function PassengerDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'favorites'>('upcoming');
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Stats
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [rating, setRating] = useState(0);

  // Load bookings with trip data
  useEffect(() => {
    if (!user?.id) return;
    loadBookings();
    loadStats();
  }, [user?.id]);

  async function loadBookings() {
    try {
      setLoading(true);

      // Get bookings for this passenger
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('passenger_id', user!.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // For each booking, fetch the trip details
      const bookingsWithTrips = await Promise.all(
        (bookingsData || []).map(async (booking: any) => {
          const { data: tripData } = await supabase
            .from('trips')
            .select('*')
            .eq('id', booking.trip_id)
            .single();

          return {
            ...booking,
            trip: tripData || undefined,
          } as BookingWithTrip;
        })
      );

      setBookings(bookingsWithTrips);
    } catch (err: any) {
      toast.error('Failed to load bookings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStatsLoading(true);

      // Count confirmed bookings
      const { count: tripsCount, error: countError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('passenger_id', user!.id)
        .eq('status', 'confirmed');

      if (countError) throw countError;

      // Total spent
      const { data: spentData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('passenger_id', user!.id)
        .eq('status', 'confirmed');

      const totalSpent = (spentData || []).reduce(
        (sum: number, b: any) => sum + (b.total_price || 0),
        0
      );

      setTotalTrips(tripsCount || 0);
      setTotalSaved(totalSpent);
      setRating(user?.rating || 5);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }

  // Split bookings into upcoming and past based on trip date
  const now = new Date().toISOString().split('T')[0];

  const upcomingBookings = bookings.filter(
    (b) =>
      b.trip &&
      b.trip.departure_date >= now &&
      b.status !== 'cancelled'
  );

  const pastBookings = bookings.filter(
    (b) =>
      !b.trip ||
      b.trip.departure_date < now ||
      b.status === 'cancelled'
  );

  const stats = [
    {
      label: 'Trips',
      value: statsLoading ? '...' : totalTrips,
      icon: Car,
    },
    {
      label: 'Rating',
      value: statsLoading ? '...' : rating,
      icon: Star,
      suffix: '/5',
    },
    {
      label: 'Spent',
      value: statsLoading ? '...' : totalSaved,
      icon: Wallet,
      prefix: 'MAD ',
    },
  ];

  const renderBookingItem = (booking: BookingWithTrip, index: number) => {
    const trip = booking.trip;
    if (!trip) {
      return (
        <motion.div
          key={booking.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02]"
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white">Trip unavailable</p>
            <p className="text-xs text-[#A0A0A0]">
              Booking #{booking.id?.slice(0, 8)}
            </p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              booking.status === 'confirmed'
                ? 'bg-green-500/10 text-green-400'
                : booking.status === 'pending'
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-red-500/10 text-red-400'
            }`}
          >
            {booking.status}
          </span>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => navigate(`/trip/${trip.id}`)}
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
              <Calendar className="w-3 h-3" />
              {trip.departure_date}
            </span>
            <span className="text-xs text-[#A0A0A0] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {trip.departure_time}
            </span>
          </div>
          {booking.seats > 1 && (
            <p className="text-xs text-[#A0A0A0] mt-1">
              {booking.seats} seats booked
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[#FF6B00]">
            {booking.total_price} MAD
          </p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              booking.status === 'confirmed'
                ? 'bg-green-500/10 text-green-400'
                : booking.status === 'pending'
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-red-500/10 text-red-400'
            }`}
          >
            {booking.status}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#A0A0A0] opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'user')}`
              }
              alt={user?.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF6B00]/30"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">
                {user?.name || 'Passenger'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="text-xs text-[#FF6B00]">
                  {user?.is_verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/search')}
            className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl"
          >
            <Car className="w-4 h-4 mr-2" /> Book a Ride
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4"
            >
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">
                {s.prefix}
                {s.value}
                {s.suffix}
              </p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            {(['upcoming', 'past', 'favorites'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                {tab}
                {tab === 'upcoming' && upcomingBookings.length > 0 && (
                  <span className="ml-1.5 text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-1.5 py-0.5 rounded-full">
                    {upcomingBookings.length}
                  </span>
                )}
                {tab === 'past' && pastBookings.length > 0 && (
                  <span className="ml-1.5 text-xs bg-white/10 text-[#A0A0A0] px-1.5 py-0.5 rounded-full">
                    {pastBookings.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Loading */}
            {loading && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
                <p className="text-sm text-[#A0A0A0] mt-2">
                  Loading your trips...
                </p>
              </div>
            )}

            {/* Upcoming Tab */}
            {!loading && activeTab === 'upcoming' && (
              <div className="space-y-2">
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map((b, i) => renderBookingItem(b, i))
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                    <p className="text-sm text-[#A0A0A0]">
                      No upcoming trips
                    </p>
                    <Button
                      onClick={() => navigate('/search')}
                      variant="outline"
                      className="mt-3 border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm"
                    >
                      Find a ride
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Past Tab */}
            {!loading && activeTab === 'past' && (
              <div className="space-y-2">
                {pastBookings.length > 0 ? (
                  pastBookings.map((b, i) => renderBookingItem(b, i))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                    <p className="text-sm text-[#A0A0A0]">
                      No past trips yet
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {!loading && activeTab === 'favorites' && (
              <div className="text-center py-8">
                <Star className="w-10 h-10 text-[#A0A0A0] mx-auto mb-3" />
                <p className="text-sm text-[#A0A0A0]">
                  Favorite routes coming soon
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Profile', icon: 'User', action: () => navigate('/profile') },
            { label: 'Messages', icon: 'MessageCircle', action: () => navigate('/messages') },
            { label: 'Verification', icon: 'Shield', action: () => navigate('/verification') },
            { label: 'Support', icon: 'Headphones', action: () => toast.info('Support coming soon') },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="bg-[#1B1F27] rounded-xl border border-white/5 p-4 text-center hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/20 transition-all group"
            >
              <p className="text-sm font-medium text-white group-hover:text-[#FF6B00] transition-colors">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
