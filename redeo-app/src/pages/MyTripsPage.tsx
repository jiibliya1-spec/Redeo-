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
    driver?: { name: string; avatar: string };
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
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips(
            from_location, to_location, departure_date, departure_time, price,
            driver:profiles(name, avatar)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data ?? []) as BookingItem[]);
    } catch (e) {
      console.error('loadBookings:', e);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('my-bookings')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `passenger_id=eq.${user.id}`,
      }, (payload) => {
        setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('passenger_id', user!.id);
      if (error) throw error;
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
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <h1 className="text-2xl font-bold text-white" dir={dir}>My Bookings</h1>
        </div>

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
            <Button onClick={() => navigate('/search')} className="mt-4 bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
              Find a Ride
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b, i) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              const StIcon = st.icon;
              const driver = (b.trip as any)?.driver;
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
                        src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.name || 'user'}`}
                        alt=""
                        className="w-10 h-10 rounded-full ring-2 ring-[#FF6B00]/20"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {b.trip?.from_location || '?'} → {b.trip?.to_location || '?'}
                        </p>
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
