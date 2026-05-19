import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Calendar, Clock, Users,
  CheckCircle, XCircle, Clock3, Inbox, Banknote,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';
const LS_KEY = 'wansniauto_bookings';

interface BookingItem {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  trip?: {
    from_location: string;
    to_location: string;
    departure_date: string;
    departure_time: string;
    price: number;
    driver_id?: string;
  };
  driver?: {
    name: string;
    avatar: string;
  };
}

function loadLocalBookings(userId: string): BookingItem[] {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return all.filter((b: any) => b.passenger_id === userId);
  } catch { return []; }
}

function patchLocalBooking(id: string, patch: Partial<BookingItem>) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    const updated = all.map((b: any) => b.id === id ? { ...b, ...patch } : b);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

export function MyTripsPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { dir } = useI18n();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const loadBookings = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';
      const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` };

      /* 1. Start with localStorage (works even when Supabase bookings table is missing) */
      let data: BookingItem[] = loadLocalBookings(user.id);

      /* 2. Try to merge from Supabase bookings table */
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?passenger_id=eq.${user.id}&order=created_at.desc&limit=100`,
          { headers }
        );
        if (res.ok) {
          const sbData: BookingItem[] = await res.json();
          const localIds = new Set(data.map(b => b.id));
          /* Merge Supabase items not in localStorage */
          for (const sb of sbData) {
            if (!localIds.has(sb.id)) data.push(sb);
          }
          /* Sync status from Supabase (driver may have accepted/rejected) */
          const sbMap = new Map(sbData.map(b => [b.id, b]));
          data = data.map(b => sbMap.has(b.id) ? { ...b, status: sbMap.get(b.id)!.status } : b);
        }
      } catch { /* bookings table missing — stay with localStorage */ }

      /* 3. Enrich items that are missing trip/driver info */
      const needsEnrich = data.filter(b => !b.trip?.from_location && b.trip_id);
      if (needsEnrich.length > 0) {
        const tripIds = [...new Set(needsEnrich.map(b => b.trip_id))];
        const tripRes = await fetch(
          `${SUPABASE_URL}/rest/v1/trips?select=id,from_location,to_location,departure_date,departure_time,price,driver_id&id=in.(${tripIds.join(',')})`,
          { headers }
        );
        if (tripRes.ok) {
          const trips: any[] = await tripRes.json();
          const tripMap = new Map(trips.map(t => [t.id, t]));

          /* Fetch drivers for enriched trips */
          const driverIds = [...new Set(trips.map(t => t.driver_id).filter(Boolean))];
          const driverMap = new Map<string, any>();
          if (driverIds.length) {
            const drRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?select=id,name,avatar&id=in.(${driverIds.join(',')})`,
              { headers }
            );
            if (drRes.ok) {
              const drivers: any[] = await drRes.json();
              drivers.forEach(d => driverMap.set(d.id, d));
            }
          }

          data = data.map(b => {
            if (!b.trip?.from_location && tripMap.has(b.trip_id)) {
              const t = tripMap.get(b.trip_id);
              return {
                ...b,
                trip: { from_location: t.from_location, to_location: t.to_location, departure_date: t.departure_date, departure_time: t.departure_time, price: t.price, driver_id: t.driver_id },
                driver: driverMap.get(t.driver_id) || b.driver,
              };
            }
            return b;
          });
        }
      }

      /* 4. Sync status from Supabase notifications (works with old AND new message formats) */
      const pendingItems = data.filter(b => b.status === 'pending');
      if (pendingItems.length) {
        try {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('id, type, title, message')
            .eq('user_id', user.id)
            .in('type', ['success', 'warning'])
            .order('created_at', { ascending: false })
            .limit(30);

          if (notifs?.length) {
            data = data.map(booking => {
              if (booking.status !== 'pending') return booking;
              for (const notif of notifs) {
                const msg = notif.message || '';
                // Try ||TRIP:id|| marker first (new format)
                const tripMatch = msg.match(/\|\|TRIP:([a-zA-Z0-9-]+)\|\|/);
                if (tripMatch && tripMatch[1] === booking.trip_id) {
                  const ns = notif.type === 'success' ? 'confirmed' : 'cancelled';
                  patchLocalBooking(booking.id, { status: ns as BookingItem['status'] });
                  return { ...booking, status: ns as BookingItem['status'] };
                }
                // Fallback: match by trip content (old format without marker)
                const from = booking.trip?.from_location;
                const to = booking.trip?.to_location;
                const date = booking.trip?.departure_date;
                if (from && to && date && msg.includes(from) && msg.includes(to) && msg.includes(date)) {
                  const ns = notif.type === 'success' ? 'confirmed' : 'cancelled';
                  patchLocalBooking(booking.id, { status: ns as BookingItem['status'] });
                  return { ...booking, status: ns as BookingItem['status'] };
                }
              }
              return booking;
            });
          }
        } catch { /* Supabase unavailable */ }
      }

      /* 5. Sort by created_at desc */
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(data);
    } catch (e) { console.error('loadBookings:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Re-read localStorage when NotificationListener updates a booking status
  useEffect(() => {
    const onBookingUpdated = () => { loadBookings(); };
    window.addEventListener('wansniauto:booking-updated', onBookingUpdated);
    // Also refresh when the tab becomes visible again (user switches back)
    const onVisible = () => { if (document.visibilityState === 'visible') loadBookings(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('wansniauto:booking-updated', onBookingUpdated);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadBookings]);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';

      /* Try Supabase first */
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch {}

      /* Always update localStorage */
      patchLocalBooking(bookingId, { status: 'cancelled' });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b));
      toast.success('Booking cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const statusConfig: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
    pending:   { label: 'Pending',   cls: 'bg-yellow-500/10 text-yellow-400', icon: Clock3 },
    confirmed: { label: 'Confirmed', cls: 'bg-green-500/10 text-green-400',   icon: CheckCircle },
    cancelled: { label: 'Cancelled', cls: 'bg-red-500/10 text-red-400',       icon: XCircle },
  };

  const filtered = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status !== 'cancelled';
    return b.status === 'cancelled';
  });

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <h1 className="text-2xl font-bold text-white" dir={dir}>My Bookings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-[#FF6B00] text-white' : 'bg-[#1B1F27] text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab === 'upcoming' ? 'Upcoming' : 'Cancelled'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-[#A0A0A0]/30 mx-auto mb-3" />
            <p className="text-[#A0A0A0]">No {activeTab} bookings</p>
            <Button onClick={() => navigate('/search')} className="mt-4 bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
              Find a Ride
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b, i) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              const StIcon = st.icon;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/trip/${b.trip_id}`)}
                  className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 cursor-pointer hover:border-[#FF6B00]/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={b.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.driver?.name || b.trip_id}`}
                        alt=""
                        className="w-10 h-10 rounded-full ring-2 ring-[#FF6B00]/20"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {b.trip?.from_location || '—'} → {b.trip?.to_location || '—'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#A0A0A0]">
                          {b.trip?.departure_date && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.trip.departure_date}</span>
                          )}
                          {b.trip?.departure_time && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.trip.departure_time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cls}`}>
                      <StIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-xs text-[#A0A0A0]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.seats} seat(s)</span>
                      <span className="flex items-center gap-1 text-[#FF6B00] font-medium">
                        <Banknote className="w-3 h-3" />{b.total_price} MAD cash
                      </span>
                    </div>
                    {b.status === 'pending' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(b.id); }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
