import { useState, useEffect, useCallback } from 'react';
import { useCity } from '@/lib/cities';
import { resolveAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RateUserSheet } from '@/components/RateUserSheet';
import { CancelBookingSheet } from '@/components/CancelBookingSheet';
import { cancelBooking } from '@/services/bookingService';
import { hasDeparted } from '@/lib/tripTime';
import { ShareTripSheet } from '@/components/ShareTripSheet';
import { useShare } from '@/lib/tripShare';
import {
  ArrowLeft, Loader2, Calendar, Clock, Users,
  CheckCircle, XCircle, Clock3, Inbox, Banknote, Star, MapPinned,
} from 'lucide-react';

interface BookingItem {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  trip?: {
    id?: string;
    from_location: string;
    to_location: string;
    departure_date: string;
    departure_time: string;
    price: number;
    driver_id?: string;
  };
  driver?: { name: string; avatar: string };
}

/** Live sharing is offered from the day before departure until the day after. */
function canShare(date: string) {
  const d = Date.parse(date + 'T00:00:00');
  const day = 86400000, today = new Date(new Date().toDateString()).getTime();
  return !isNaN(d) && d >= today - day && d <= today + day;
}

export function MyTripsPage() {
  const city = useCity();
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'cancelled'>('upcoming');
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [rateTarget, setRateTarget] = useState<BookingItem | null>(null);
  const [shareTarget, setShareTarget] = useState<BookingItem | null>(null);
  const activeShareTrip = useShare((s) => s.session?.tripId);

  const loadBookings = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      let data: BookingItem[] = [];
      let fromSupabase = false;

      try {
        const { data: sb, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && sb) { data = sb as BookingItem[]; fromSupabase = true; }
      } catch { }

      if (!fromSupabase) {
        try {
          const all: any[] = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
          data = all.filter(b => b.passenger_id === user.id);
        } catch {}
      }

      const needsEnrich = data.filter(b => !b.trip?.from_location && b.trip_id);
      if (needsEnrich.length > 0) {
        const tripIds = [...new Set(needsEnrich.map(b => b.trip_id))];
        const { data: trips } = await supabase
          .from('trips')
          .select('id, from_location, to_location, departure_date, departure_time, price, driver_id')
          .in('id', tripIds);

        if (trips?.length) {
          const tripMap = new Map(trips.map(tr => [tr.id, tr]));
          const driverIds = [...new Set(trips.map(tr => tr.driver_id).filter(Boolean))];
          const driverMap = new Map<string, any>();
          if (driverIds.length) {
            const { data: drivers } = await supabase.from('public_profiles').select('id, name, avatar').in('id', driverIds);
            drivers?.forEach(d => driverMap.set(d.id, d));
          }
          data = data.map(b => {
            const tr = tripMap.get(b.trip_id);
            if (!b.trip?.from_location && tr) {
              return {
                ...b,
                trip: { id: tr.id, from_location: tr.from_location, to_location: tr.to_location, departure_date: tr.departure_date, departure_time: tr.departure_time, price: tr.price, driver_id: tr.driver_id },
                driver: driverMap.get(tr.driver_id) || b.driver,
              };
            }
            return b;
          });
        }
      }

      if (!fromSupabase) {
        const pending = data.filter(b => b.status === 'pending');
        if (pending.length) {
          try {
            const { data: notifs } = await supabase
              .from('notifications')
              .select('type, message')
              .eq('user_id', user.id)
              .in('type', ['success', 'warning'])
              .order('created_at', { ascending: false })
              .limit(30);
            if (notifs?.length) {
              data = data.map(booking => {
                if (booking.status !== 'pending') return booking;
                for (const notif of notifs) {
                  const msg = notif.message || '';
                  const tripMatch = msg.match(/\|\|TRIP:([a-zA-Z0-9-]+)\|\|/);
                  if (tripMatch && tripMatch[1] === booking.trip_id) {
                    return { ...booking, status: (notif.type === 'success' ? 'confirmed' : 'cancelled') as BookingItem['status'] };
                  }
                  const from = booking.trip?.from_location;
                  const to = booking.trip?.to_location;
                  const date = booking.trip?.departure_date;
                  if (from && to && date && msg.includes(from) && msg.includes(to) && msg.includes(date)) {
                    return { ...booking, status: (notif.type === 'success' ? 'confirmed' : 'cancelled') as BookingItem['status'] };
                  }
                }
                return booking;
              });
            }
          } catch {}
        }
      }

      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(data);
      // Which trips did I already rate?
      supabase.from('reviews').select('booking_id').eq('reviewer_id', user.id).then(({ data: rv }) => {
        if (rv) setRatedIds(new Set(rv.map((r: any) => r.booking_id)));
      });
    } catch (e) { console.error('loadBookings:', e); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

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

  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    const b = cancelTarget;
    if (!b || !user?.id) return;
    if (b.trip && hasDeparted(b.trip as any)) { toast.error(t('book.cancel_too_late')); setCancelTarget(null); return; }
    setCancelling(true);
    try {
      await cancelBooking(b as any, user.id, user.name || '');
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'cancelled' as const } : x));
      toast.success(t('book.cancelled_ok'));
      setCancelTarget(null);
    } catch { toast.error(t('book.failed_cancel')); }
    setCancelling(false);
  };

  const statusConfig = {
    pending:   { label: t('status.pending'),   cls: 'bg-yellow-500/10 text-yellow-400', Icon: Clock3 },
    confirmed: { label: t('status.confirmed'), cls: 'bg-green-500/10 text-green-400',   Icon: CheckCircle },
    cancelled: { label: t('status.cancelled'), cls: 'bg-red-500/10 text-red-400',       Icon: XCircle },
  };

  const filtered = bookings.filter(b =>
    activeTab === 'upcoming' ? b.status !== 'cancelled' : b.status === 'cancelled'
  );

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-8" dir={dir}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <h1 className="text-2xl font-bold text-white">{t('mytrips.title')}</h1>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: 'upcoming' as const, label: t('mytrips.upcoming') },
            { key: 'cancelled' as const, label: t('mytrips.cancelled_tab') },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-[#FF6B00] text-white' : 'bg-[#1B1F27] text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-[#A0A0A0]/30 mx-auto mb-3" />
            <p className="text-[#A0A0A0]">{activeTab === 'upcoming' ? t('mytrips.no_upcoming') : t('mytrips.no_cancelled')}</p>
            <Button onClick={() => navigate('/search')} className="mt-4 bg-[#FF6B00] hover:bg-[#E56000] text-white rounded-xl">
              {t('mytrips.find_ride')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b, i) => {
              const st = statusConfig[b.status] || statusConfig.pending;
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
                        src={resolveAvatar(b.driver?.avatar, (b.driver as any)?.id || (b.trip as any)?.driver_id || (b as any).driver_id)}
                        alt=""
                        className="w-10 h-10 rounded-full ring-2 ring-[#FF6B00]/20"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {b.trip?.from_location ? city(b.trip.from_location) : '—'} → {b.trip?.to_location ? city(b.trip.to_location) : '—'}
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
                      <st.Icon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-xs text-[#A0A0A0]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.seats} {t('mytrips.seats')}</span>
                      <span className="flex items-center gap-1 text-[#FF6B00] font-medium">
                        <Banknote className="w-3 h-3" />{b.total_price} {t('trip.price')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                    {b.status === 'confirmed' && b.trip?.departure_date && canShare(b.trip.departure_date) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShareTarget(b); }}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${activeShareTrip === b.trip_id ? 'text-green-400 bg-green-500/10' : 'text-[#FF6B00] bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20'}`}
                      >
                        <MapPinned className="w-3 h-3" />{activeShareTrip === b.trip_id ? t('share.live') : t('share.btn')}
                      </button>
                    )}
                    {b.status === 'confirmed' && b.trip?.departure_date && b.trip.departure_date <= new Date().toISOString().split('T')[0] && (b.trip.driver_id || (b as any).driver_id) && (
                      ratedIds.has(b.id) ? (
                        <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Star className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" />{t('rating.rated')}</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRateTarget(b); }}
                          className="flex items-center gap-1 text-xs text-[#FF6B00] px-3 py-1.5 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 transition-colors font-medium"
                        >
                          <Star className="w-3 h-3" />{t('rating.rate_driver')}
                        </button>
                      )
                    )}
                    {(b.status === 'pending' || b.status === 'confirmed') && !(b.trip && hasDeparted(b.trip as any)) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCancelTarget(b); }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        {t('mytrips.cancel_btn')}
                      </button>
                    )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {rateTarget && user?.id && (
        <RateUserSheet
          open
          onClose={() => setRateTarget(null)}
          onDone={(id) => setRatedIds(prev => new Set(prev).add(id))}
          reviewerId={user.id}
          revieweeId={(rateTarget.trip?.driver_id || (rateTarget as any).driver_id) as string}
          tripId={rateTarget.trip_id}
          bookingId={rateTarget.id}
          name={rateTarget.driver?.name}
        />
      )}
      {shareTarget?.trip && (
        <ShareTripSheet open onClose={() => setShareTarget(null)} tripId={shareTarget.trip_id} from={shareTarget.trip.from_location} to={shareTarget.trip.to_location} />
      )}
      <CancelBookingSheet open={!!cancelTarget} busy={cancelling} route={cancelTarget?.trip ? `${city(cancelTarget.trip.from_location)} → ${city(cancelTarget.trip.to_location)}` : undefined} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />
    </div>
  );
}
