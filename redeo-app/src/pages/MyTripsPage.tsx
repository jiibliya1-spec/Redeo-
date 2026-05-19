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
  CheckCircle, XCircle, Clock3, Inbox,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface BookingItem {
  id: string;
  trip_id: string;
  driver_id: string;
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
  };
  driver?: {
    name: string;
    avatar: string;
  };
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

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?passenger_id=eq.${user.id}&order=created_at.desc&limit=100`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
      );

      let data: BookingItem[] = [];
      if (res.ok) {
        data = await res.json();
      }

      // Fallback: merge with localStorage
      const local = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]')
        .filter((b: any) => b.passenger_id === user.id);
      const existingIds = new Set(data.map(b => b.id));
      data = [...data, ...local.filter((b: any) => !existingIds.has(b.id))];

      // Enrich with trip + driver info
      for (const b of data) {
        if (b.trip_id) {
          const tripRes = await fetch(
            `${SUPABASE_URL}/rest/v1/trips?select=*&id=eq.${b.trip_id}&limit=1`,
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
          );
          if (tripRes.ok) {
            const trips = await tripRes.json();
            if (trips?.[0]) b.trip = trips[0];
          }
          if (b.driver_id) {
            const driverRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?select=name,avatar&id=eq.${b.driver_id}&limit=1`,
              { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
            );
            if (driverRes.ok) {
              const drivers = await driverRes.json();
              if (drivers?.[0]) b.driver = drivers[0];
            }
          }
        }
      }

      setBookings(data);
    } catch (e) { console.error('loadBookings:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
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
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
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
              {tab === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-[#A0A0A0]/30 mx-auto mb-3" />
            <p className="text-[#A0A0A0]">No {activeTab} bookings</p>
            <Button onClick={() => navigate('/search')} className="mt-4 bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">Find a Ride</Button>
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
                      <img src={b.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.driver?.name}`} alt="" className="w-10 h-10 rounded-full ring-2 ring-[#FF6B00]/20" />
                      <div>
                        <p className="text-sm font-medium text-white">{b.trip?.from_location || '??'} → {b.trip?.to_location || '??'}</p>
                        <div className="flex items-center gap-2 text-xs text-[#A0A0A0]">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.trip?.departure_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.trip?.departure_time}</span>
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
                      <span className="text-[#FF6B00] font-medium">{b.total_price} MAD</span>
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
