import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet, apiPost, supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trip } from '@/types';
import {
  Car,
  Plus,
  DollarSign,
  Star,
  Users,
  X,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  CarFront,
  Shield,
  Check,
  ShieldCheck,
  Inbox,
  Banknote,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

interface BookingRequest {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at: string;
  passenger?: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    trips_count: number;
    is_verified: boolean;
    phone?: string;
  };
  trip?: {
    from_location: string;
    to_location: string;
    departure_date: string;
    departure_time: string;
  };
}

// ─── Vehicle Manager ───
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
}

function VehicleManager({ vehicles, onAdd, onRemove }: {
  vehicles: Vehicle[];
  onAdd: (v: Vehicle) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  const handleAdd = () => {
    if (!make || !model || !plate) return;
    onAdd({
      id: `v-${Date.now()}`,
      make, model,
      year: parseInt(year) || new Date().getFullYear(),
      color, plate,
      seats: 4,
    });
    setShowAdd(false);
    setMake(''); setModel(''); setYear(''); setColor(''); setPlate('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('driver.vehicle_info')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-[#FF6B00] hover:underline">
          {showAdd ? t('common.cancel') : '+ ' + t('driver.vehicle_info')}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
            <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder={t('driver.make')} value={make} onChange={e => setMake(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder={t('driver.model')} value={model} onChange={e => setModel(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder={t('driver.year')} type="number" value={year} onChange={e => setYear(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder={t('driver.color')} value={color} onChange={e => setColor(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder={t('driver.plate')} value={plate} onChange={e => setPlate(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
              </div>
              <Button onClick={handleAdd} size="sm" className="bg-[#FF6B00] text-white rounded-xl text-xs w-full">
                {t('common.save')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {vehicles.map(v => (
          <div key={v.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
              <CarFront className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{v.make} {v.model}</p>
              <p className="text-xs text-[#A0A0A0]">{v.year} &middot; {v.color} &middot; {v.plate}</p>
            </div>
            <button onClick={() => onRemove(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="text-center py-4 bg-white/5 rounded-xl">
            <CarFront className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
            <p className="text-xs text-[#A0A0A0]">{t('driver.vehicle_info')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalPassengers, setTotalPassengers] = useState(0);

  // Publish form
  const [showPublish, setShowPublish] = useState(false);
  const [showVerifyAlert, setShowVerifyAlert] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('3');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const raw = localStorage.getItem('wansniauto_vehicles');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Tabs
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'vehicles' | 'requests'>('upcoming');

  // Booking requests
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadBookingRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    try {
      const headers = await getAuthHeaders();

      // 1. Get driver's trip IDs from Supabase
      const tripsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/trips?select=id,from_location,to_location,departure_date,departure_time,available_seats&driver_id=eq.${user.id}`,
        { headers }
      );
      if (!tripsRes.ok) { setLoadingRequests(false); return; }
      const driverTrips: any[] = await tripsRes.json();
      if (!driverTrips.length) { setBookingRequests([]); setLoadingRequests(false); return; }

      const tripIds = new Set(driverTrips.map((t: any) => t.id));
      const tripMap = new Map(driverTrips.map((t: any) => [t.id, t]));

      // 2a. Try Supabase bookings table first
      let bookings: BookingRequest[] = [];
      try {
        const bookRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?trip_id=in.(${[...tripIds].join(',')})&status=eq.pending&order=created_at.desc&limit=50`,
          { headers }
        );
        if (bookRes.ok) {
          bookings = await bookRes.json();
        }
      } catch { /* table not found — fall through to localStorage */ }

      // 2b. Merge with localStorage (covers when Supabase bookings table is missing)
      try {
        const localAll: any[] = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
        const localPending = localAll.filter(
          (b: any) => tripIds.has(b.trip_id) && b.status === 'pending'
        );
        const existingIds = new Set(bookings.map(b => b.id));
        for (const lb of localPending) {
          if (!existingIds.has(lb.id)) bookings.push(lb as BookingRequest);
        }
      } catch {}

      // 2c. Filter out already-processed bookings (accepted or declined)
      const processedIds = getProcessedIds();
      bookings = bookings.filter(b => !processedIds.has(b.id));

      if (!bookings.length) { setBookingRequests([]); setLoadingRequests(false); return; }

      // 3. Get passenger profiles
      const passengerIds = [...new Set(bookings.map(b => b.passenger_id))];
      const passengerMap = new Map<string, any>();
      try {
        const passRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=id,name,avatar,rating,trips_count,is_verified,phone&id=in.(${passengerIds.join(',')})`,
          { headers }
        );
        if (passRes.ok) {
          const passengers = await passRes.json();
          passengers.forEach((p: any) => passengerMap.set(p.id, p));
        }
      } catch {}

      const enriched = bookings.map(b => ({
        ...b,
        passenger: passengerMap.get(b.passenger_id) || b.passenger,
        trip: tripMap.get(b.trip_id) || b.trip,
      }));

      setBookingRequests(enriched);
    } catch (e) { console.error('loadBookingRequests error:', e); }
    setLoadingRequests(false);
  }, [user?.id, getAuthHeaders]);

  /** Patch a booking in localStorage */
  const patchLocalBooking = (id: string, patch: Record<string, unknown>) => {
    try {
      const all = JSON.parse(localStorage.getItem('wansniauto_bookings') || '[]');
      localStorage.setItem('wansniauto_bookings', JSON.stringify(
        all.map((b: any) => b.id === id ? { ...b, ...patch } : b)
      ));
    } catch {}
  };

  /** Permanently mark a booking as processed so it never reappears in Requests */
  const PROCESSED_KEY = 'wansniauto_processed_requests';
  const markBookingProcessed = (id: string) => {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem(PROCESSED_KEY) || '[]');
      if (!existing.includes(id)) {
        localStorage.setItem(PROCESSED_KEY, JSON.stringify([...existing, id]));
      }
    } catch {}
  };
  const getProcessedIds = (): Set<string> => {
    try {
      return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) || '[]'));
    } catch { return new Set(); }
  };

  const handleAcceptBooking = async (booking: BookingRequest) => {
    setProcessingBookingId(booking.id);
    try {
      const headers = await getAuthHeaders();
      const tripData = booking.trip as any;

      // 1. Update localStorage immediately (works even without Supabase bookings table)
      patchLocalBooking(booking.id, { status: 'confirmed' });

      // 2. Try Supabase bookings table (best-effort)
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'confirmed' }),
        });
      } catch {}

      // 3. Decrease available_seats on the trip
      if (booking.trip_id) {
        try {
          const tripRes = await fetch(
            `${SUPABASE_URL}/rest/v1/trips?select=available_seats&id=eq.${booking.trip_id}&limit=1`,
            { headers }
          );
          if (tripRes.ok) {
            const [t] = await tripRes.json();
            if (t && typeof t.available_seats === 'number') {
              await fetch(`${SUPABASE_URL}/rest/v1/trips?id=eq.${booking.trip_id}`, {
                method: 'PATCH',
                headers: { ...headers, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ available_seats: Math.max(0, t.available_seats - booking.seats) }),
              });
            }
          }
        } catch {}
      }

      // 4. Mark as processed permanently (prevents reappearance on refresh)
      markBookingProcessed(booking.id);

      // 5. Notify passenger (best-effort)
      fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: booking.passenger_id,
          type: 'success',
          title: 'Booking Confirmed ✅',
          message: `Your booking for ${booking.seats} seat(s) on the trip ${tripData?.from_location || ''} → ${tripData?.to_location || ''} on ${tripData?.departure_date || ''} has been confirmed! Pay ${booking.total_price} MAD cash to the driver.`,
          read: false,
        }),
      }).catch(() => {});

      toast.success('Booking accepted! Passenger has been notified.');
      setBookingRequests(prev => prev.filter(b => b.id !== booking.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to accept booking');
    }
    setProcessingBookingId(null);
  };

  const handleRejectBooking = async (booking: BookingRequest) => {
    setProcessingBookingId(booking.id);
    try {
      const headers = await getAuthHeaders();
      const tripData = booking.trip as any;

      // 1. Update localStorage immediately
      patchLocalBooking(booking.id, { status: 'cancelled' });

      // 2. Try Supabase bookings table (best-effort)
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch {}

      // 3. Mark as processed permanently (prevents reappearance on refresh)
      markBookingProcessed(booking.id);

      // 4. Notify passenger (best-effort)
      fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: booking.passenger_id,
          type: 'warning',
          title: 'Booking Not Accepted',
          message: `Unfortunately your booking for the trip ${tripData?.from_location || ''} → ${tripData?.to_location || ''} on ${tripData?.departure_date || ''} was not accepted by the driver. Please try another trip.`,
          read: false,
        }),
      }).catch(() => {});

      toast.success('Booking declined. Passenger has been notified.');
      setBookingRequests(prev => prev.filter(b => b.id !== booking.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to decline booking');
    }
    setProcessingBookingId(null);
  };

  // Load trips
  useEffect(() => {
    if (!user?.id) return;
    loadTrips();
  }, [user?.id]);

  // Load booking requests when tab opened or on mount
  useEffect(() => {
    if (!user?.id) return;
    loadBookingRequests();
  }, [loadBookingRequests]);

  async function loadTrips() {
    try {
      setLoading(true);

      let allTrips: Trip[] = [];

      try {
        const data = await apiGet('trips', { eq: { driver_id: user!.id }, order: 'departure_date' });
        if (data && data.length > 0) {
          allTrips = data.map((t: any) => ({
            ...t,
            driver: { id: user?.id || '', name: user?.name || '', email: user?.email || '', avatar: user?.avatar || '', role: 'driver' as const, rating: user?.rating || 5, trips_count: 0 },
          })) as Trip[];
        }
      } catch (e) {
        console.error('Failed to load trips from Supabase:', e);
      }

      setTrips(allTrips);
      setTotalTrips(allTrips.length);
      setAvgRating(user?.rating || 0);

      // Load bookings from Supabase
      let driverBookings: any[] = [];
      try {
        const bookingsData = await apiGet('bookings', { eq: { driver_id: user!.id } });
        driverBookings = (bookingsData || []).filter((b: any) => b.status === 'confirmed');
      } catch { /* silent */ }

      const earnings = driverBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
      const passengers = driverBookings.reduce((sum: number, b: any) => sum + (b.seats || 0), 0);

      setTotalEarnings(earnings);
      setTotalPassengers(passengers);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const isVerified = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved';
    if (!isVerified) {
      setShowVerifyAlert(true);
      return;
    }

    if (from === to) {
      toast.error('Departure and arrival must be different');
      return;
    }
    if (!vehicles.length) {
      toast.error('Please add a vehicle first');
      return;
    }

    setIsPublishing(true);

    try {
      const tripData = {
        driver_id: user.id,
        from_location: from,
        to_location: to,
        departure_date: date,
        departure_time: time,
        arrival_time: '',
        price: parseFloat(price),
        available_seats: parseInt(seats),
        total_seats: parseInt(seats),
        status: 'upcoming',
      };

      const result = await apiPost('trips', tripData);
      if (!result || !result[0]?.id) {
        throw new Error('Failed to save trip to database');
      }

      const newTrip: Trip = {
        ...tripData,
        id: result[0].id,
        status: 'upcoming' as const,
        driver: { id: user.id, name: user.name || '', email: user.email || '', avatar: user.avatar || '', role: 'driver' as const, rating: user.rating || 5, trips_count: 0 },
      };

      setTrips(prev => [...prev, newTrip]);
      setTotalTrips(prev => prev + 1);

      toast.success('Trip published successfully!');
      setShowPublish(false);
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3'); setDistance(''); setDuration('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish trip');
    }
    setIsPublishing(false);
  };

  const handleAddVehicle = (v: Vehicle) => {
    const updated = [...vehicles, v];
    setVehicles(updated);
    localStorage.setItem('wansniauto_vehicles', JSON.stringify(updated));
    toast.success('Vehicle added!');
  };

  const handleRemoveVehicle = (id: string) => {
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    localStorage.setItem('wansniauto_vehicles', JSON.stringify(updated));
  };

  const now = new Date().toISOString().split('T')[0];
  const upcomingTrips = trips.filter(t => t.departure_date >= now);
  const pastTrips = trips.filter(t => t.departure_date < now);

  const stats = [
    { label: t('driver.earnings'), value: totalEarnings, icon: DollarSign, prefix: 'MAD ', suffix: '' },
    { label: t('driver.rating'), value: avgRating, icon: Star, prefix: '', suffix: '/5' },
    { label: t('driver.trips'), value: totalTrips, icon: TrendingUp, prefix: '', suffix: '' },
    { label: t('driver.passengers'), value: totalPassengers, icon: Users, prefix: '', suffix: '' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      {/* Verification Required Alert */}
      <AnimatePresence>
        {showVerifyAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#1B1F27] rounded-2xl border border-white/10 p-6 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{t('verify.required')}</h3>
              <p className="text-sm text-[#A0A0A0] mb-6">{t('driver.verify_before_publish')}</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowVerifyAlert(false)} variant="outline" className="flex-1 border-white/10 text-white rounded-xl">
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => { setShowVerifyAlert(false); navigate('/verification'); }} className="flex-1 bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl">
                  {t('verify.title')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublish && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#1B1F27] rounded-2xl border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{t('driver.publish')}</h2>
                <button onClick={() => setShowPublish(false)} className="p-2 rounded-xl hover:bg-white/5"><X className="w-5 h-5 text-[#A0A0A0]" /></button>
              </div>
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.from')}</Label>
                    <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                      <option value="">{t('common.select_city')}</option>
                      {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.to')}</Label>
                    <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                      <option value="">{t('common.select_city')}</option>
                      {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.date')}</Label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.time')}</Label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.price')}</Label>
                    <Input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.seats')}</Label>
                    <select value={seats} onChange={e => setSeats(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.distance')}</Label>
                    <Input type="text" value={distance} onChange={e => setDistance(e.target.value)} placeholder="240 km" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.duration')}</Label>
                    <Input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="2h 30min" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div>
                  <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.vehicle_info')}</Label>
                  {vehicles.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {vehicles.map(v => (
                        <div key={v.id} className="flex items-center gap-3 p-3 bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl">
                          <CarFront className="w-5 h-5 text-[#FF6B00]" />
                          <span className="text-sm text-white">{v.make} {v.model} ({v.color})</span>
                          <span className="text-xs text-[#A0A0A0] ml-auto">{v.plate}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">{t('driver.vehicle_info')}</span>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={isPublishing || !vehicles.length} className="w-full bg-[#FF6B00] text-white rounded-xl h-12 font-semibold disabled:opacity-50 mt-2">
                  {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : t('driver.publish_btn')}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" dir={dir}>{t('driver.title')}</h1>
            <p className="text-sm text-[#A0A0A0] mt-1">{t('driver.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const isVerified = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved';
                if (!isVerified) {
                  setShowVerifyAlert(true);
                  return;
                }
                setShowPublish(true);
              }}
              className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl shadow-lg shadow-[#FF6B00]/20"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('driver.publish')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, idx) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">{s.prefix}{s.value}{s.suffix}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl mb-6 border border-white/5">
          {([
            { key: 'upcoming' as const, label: t('passenger.upcoming') },
            { key: 'requests' as const, label: `Requests${bookingRequests.length > 0 ? ` (${bookingRequests.length})` : ''}` },
            { key: 'past' as const, label: t('passenger.past') },
            { key: 'vehicles' as const, label: 'Vehicles' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key === 'requests') loadBookingRequests(); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? tab.key === 'requests' && bookingRequests.length > 0
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-[#FF6B00]/10 text-[#FF6B00]'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          {/* Upcoming */}
          {activeTab === 'upcoming' && (
            <div>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('passenger.upcoming')}</h3>
                <span className="text-xs text-[#A0A0A0]">{upcomingTrips.length} {t('driver.trips').toLowerCase()}</span>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
                  <p className="text-sm text-[#A0A0A0] mt-2">{t('common.loading')}</p>
                </div>
              ) : upcomingTrips.length === 0 ? (
                <div className="p-8 text-center">
                  <Car className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0A0A0] mb-2">{t('driver.no_trips')}</p>
                  <p className="text-xs text-[#A0A0A0]">Start earning by publishing your first trip!</p>
                  <Button onClick={() => {
                    const isVerified = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved';
                    if (!isVerified) { setShowVerifyAlert(true); return; }
                    setShowPublish(true);
                  }} variant="outline" className="mt-4 border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">
                    {t('driver.publish_first')}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {upcomingTrips.map((trip, idx) => (
                    <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} onClick={() => navigate(`/trip/${trip.id}`)} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-[#FF6B00]" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <p className="text-sm text-white font-medium truncate">{trip.from_location} &rarr; {trip.to_location}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#A0A0A0] flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.departure_date}</span>
                          <span className="text-xs text-[#A0A0A0] flex items-center gap-1"><Clock className="w-3 h-3" />{trip.departure_time}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-[#FF6B00] font-bold">{trip.price} MAD</p>
                        <p className="text-xs text-[#A0A0A0]">{trip.available_seats}/{trip.total_seats} seats</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A0A0A0] shrink-0" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking Requests */}
          {activeTab === 'requests' && (
            <div>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">Booking Requests</h3>
                <button onClick={loadBookingRequests} className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
                  {loadingRequests ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Refresh
                </button>
              </div>

              {loadingRequests ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
                  <p className="text-sm text-[#A0A0A0] mt-2">Loading requests...</p>
                </div>
              ) : bookingRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0A0A0]">No pending booking requests</p>
                  <p className="text-xs text-[#A0A0A0] mt-1">Requests from passengers will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {bookingRequests.map((booking, idx) => {
                    const p = booking.passenger;
                    const t = booking.trip as any;
                    const isProcessing = processingBookingId === booking.id;
                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="p-4"
                      >
                        {/* Trip info */}
                        <div className="flex items-center gap-2 mb-3 text-xs text-[#A0A0A0]">
                          <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <span className="text-white font-medium">{t?.from_location} → {t?.to_location}</span>
                          <span>·</span>
                          <Calendar className="w-3 h-3" />
                          <span>{t?.departure_date} at {t?.departure_time}</span>
                        </div>

                        {/* Passenger profile */}
                        <div className="flex items-center gap-3 bg-[#0F1115] rounded-xl p-3 mb-3">
                          <div className="relative shrink-0">
                            <img
                              src={p?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p?.name || booking.passenger_id}`}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            {p?.is_verified && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-green-500 rounded-full flex items-center justify-center">
                                <ShieldCheck className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{p?.name || 'Passenger'}</p>
                              {p?.is_verified && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">Verified</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" />
                              <span className="text-xs text-[#A0A0A0]">{(p?.rating || 5).toFixed(1)} · {p?.trips_count || 0} trips</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[#FF6B00]">{booking.seats} seat(s)</p>
                            <div className="flex items-center gap-1 text-xs text-[#A0A0A0]">
                              <Banknote className="w-3 h-3" />
                              <span>{booking.total_price} MAD</span>
                            </div>
                          </div>
                        </div>

                        {/* Accept / Reject buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAcceptBooking(booking)}
                            disabled={isProcessing}
                            className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl h-10 text-sm font-medium"
                            variant="outline"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" />Accept</>}
                          </Button>
                          <Button
                            onClick={() => handleRejectBooking(booking)}
                            disabled={isProcessing}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl h-10 text-sm font-medium"
                            variant="outline"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1.5" />Decline</>}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Past */}
          {activeTab === 'past' && (
            <div>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('passenger.past')}</h3>
                <span className="text-xs text-[#A0A0A0]">{pastTrips.length} {t('driver.trips').toLowerCase()}</span>
              </div>
              {pastTrips.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0A0A0]">{t('passenger.no_past')}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {pastTrips.map((trip, idx) => (
                    <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} onClick={() => navigate(`/trip/${trip.id}`)} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer opacity-60">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-[#A0A0A0]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{trip.from_location} &rarr; {trip.to_location}</p>
                        <p className="text-xs text-[#A0A0A0]">{trip.departure_date} &middot; {trip.price} MAD</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vehicles */}
          {activeTab === 'vehicles' && (
            <div className="p-5">
              <VehicleManager vehicles={vehicles} onAdd={handleAddVehicle} onRemove={handleRemoveVehicle} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
