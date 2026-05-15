import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { apiGet, apiPost } from '@/lib/supabase';
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
} from 'lucide-react';

const LOCAL_TRIPS_KEY = 'wansniauto_trips';
const LOCAL_BOOKINGS_KEY = 'wansniauto_bookings';

function getLocalTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalTrips(trips: Trip[]) {
  try {
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(trips));
  } catch { /* silent */ }
}

function getLocalBookings(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Stats
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalPassengers, setTotalPassengers] = useState(0);

  // Publish form
  const [showPublish, setShowPublish] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('3');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Vehicle
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  // Load trips
  useEffect(() => {
    if (!user?.id) return;
    loadTrips();
  }, [user?.id]);

  async function loadTrips() {
    try {
      setLoading(true);
      setStatsLoading(true);

      let allTrips: Trip[] = [];

      try {
        // Use REST API directly
        const data = await apiGet('trips', { eq: { driver_id: user!.id }, order: 'departure_date' });
        
        if (data && data.length > 0) {
          allTrips = data.map((t: any) => ({
            ...t,
            driver: { id: user?.id || '', name: user?.name || '', email: user?.email || '', avatar: user?.avatar || '', role: 'driver' as const, rating: user?.rating || 5, trips_count: 0 },
          })) as Trip[];
        }
      } catch {
        console.log('REST API trips not available, using localStorage');
      }

      // Fallback to localStorage
      if (allTrips.length === 0) {
        const localTrips = getLocalTrips();
        allTrips = localTrips.filter((t: Trip) => t.driver_id === user!.id);
      }

      setTrips(allTrips);
      setTotalTrips(allTrips.length);
      setAvgRating(user?.rating || 0);

      // Calculate stats from local bookings
      const localBookings = getLocalBookings();
      const driverBookings = localBookings.filter((b: any) => {
        const trip = allTrips.find((t: Trip) => t.id === b.trip_id);
        return trip && b.status === 'confirmed';
      });
      const earnings = driverBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
      const passengers = driverBookings.reduce((sum: number, b: any) => sum + (b.seats || 0), 0);

      setTotalEarnings(earnings);
      setTotalPassengers(passengers);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (from === to) {
      toast.error('Departure and arrival cities must be different');
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
        distance: distance || '0 km',
        duration: duration || '',
        status: 'upcoming',
        route: [from, to],
        amenities: ['Air Conditioning'],
      };

      let savedId = `local-${Date.now()}`;

      // Try REST API first
      try {
        const result = await apiPost('trips', tripData);
        if (result && result[0]?.id) {
          savedId = result[0].id;
        }
      } catch {
        // REST API failed, use local ID
        console.log('REST API post failed, using localStorage');
      }

      const newTrip: Trip = {
        ...tripData,
        id: savedId,
        status: 'upcoming' as const,
        driver: { id: user.id, name: user.name || '', email: user.email || '', avatar: user.avatar || '', role: 'driver' as const, rating: user.rating || 5, trips_count: 0 },
      };

      // Save to localStorage
      const existingTrips = getLocalTrips();
      saveLocalTrips([...existingTrips, newTrip]);

      // Update state
      setTrips(prev => [...prev, newTrip]);
      setTotalTrips(prev => prev + 1);

      toast.success('Trip published successfully!');
      setShowPublish(false);
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3'); setDistance(''); setDuration('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish trip');
    } finally {
      setIsPublishing(false);
    }
  };

  const stats = [
    { label: 'Earnings', value: statsLoading ? '...' : totalEarnings, icon: DollarSign, prefix: 'MAD ' },
    { label: 'Rating', value: statsLoading ? '...' : avgRating, icon: Star, suffix: '/5' },
    { label: 'Trips', value: statsLoading ? '...' : totalTrips, icon: Car },
    { label: 'Passengers', value: statsLoading ? '...' : totalPassengers, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Driver Dashboard</h1>
            <p className="text-sm text-[#A0A0A0] mt-1">Manage your rides and earnings</p>
          </div>
          <Button onClick={() => setShowPublish(true)} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Publish Trip
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">{s.prefix}{s.value}{s.suffix}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Publish Modal */}
        {showPublish && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1B1F27] rounded-2xl border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Publish a Trip</h2>
                <button onClick={() => setShowPublish(false)} className="p-2 rounded-xl hover:bg-white/5"><X className="w-5 h-5 text-[#A0A0A0]" /></button>
              </div>
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">From</Label>
                    <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                      <option value="">Select city</option>
                      {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">To</Label>
                    <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                      <option value="">Select city</option>
                      {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Date</Label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Time</Label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Price (MAD)</Label>
                    <Input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Seats</Label>
                    <select value={seats} onChange={e => setSeats(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Distance (optional)</Label>
                    <Input type="text" value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 240 km" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Duration (optional)</Label>
                    <Input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 2h 30min" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="border border-[#FF6B00]/20 rounded-xl p-4 space-y-3 bg-[#FF6B00]/5">
                  <div className="flex items-center gap-2 text-[#FF6B00]">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">Vehicle Information</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Make (e.g. Mercedes)" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
                    <Input placeholder="Model (e.g. C-Class)" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Year" type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                    <Input placeholder="Color" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                    <Input placeholder="Plate #" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
                  </div>
                </div>

                <Button type="submit" disabled={isPublishing} className="w-full bg-[#FF6B00] text-white rounded-xl h-12 font-semibold disabled:opacity-50 mt-2">
                  {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Trip'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* My Trips */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">My Published Trips</h3>
            <span className="text-xs text-[#A0A0A0]">{trips.length} trips</span>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-sm text-[#A0A0A0] mt-2">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="p-8 text-center">
              <Car className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
              <p className="text-sm text-[#A0A0A0]">No trips published yet</p>
              <Button onClick={() => setShowPublish(true)} variant="outline" className="mt-3 border-[#FF6B00]/30 text-[#FF6B00] rounded-xl text-sm">
                Publish your first trip
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {trips.map((trip, i) => (
                <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/trip/${trip.id}`)} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
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
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${trip.status === 'upcoming' ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : trip.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' : trip.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{trip.status}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
