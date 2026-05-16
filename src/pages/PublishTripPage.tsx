import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiPost } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trip } from '@/types';
import {
  ArrowLeft, Plus, Loader2, MapPin, Calendar, Clock,
  AlertCircle, DollarSign, Users, CarFront, ChevronRight,
} from 'lucide-react';

const LOCAL_TRIPS_KEY = 'wansniauto_trips';

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

export function PublishTripPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('3');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);

  // Load recent trips
  useEffect(() => {
    if (!user?.id) return;
    const localTrips = getLocalTrips();
    setRecentTrips(localTrips.filter((t: Trip) => t.driver_id === user.id).slice(0, 5));
  }, [user?.id]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (from === to) {
      toast.error('Departure and arrival must be different');
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

      try {
        const result = await apiPost('trips', tripData);
        if (result && result[0]?.id) savedId = result[0].id;
      } catch {
        console.log('REST API post failed, using localStorage');
      }

      const newTrip: Trip = {
        ...tripData,
        id: savedId,
        status: 'upcoming' as const,
        driver: { id: user.id, name: user.name || '', email: user.email || '', avatar: user.avatar || '', role: 'driver' as const, rating: user.rating || 5, trips_count: 0 },
      };

      const existingTrips = getLocalTrips();
      saveLocalTrips([...existingTrips, newTrip]);

      toast.success('Trip published!');
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3'); setDistance(''); setDuration('');

      // Refresh
      setRecentTrips(prev => [newTrip, ...prev].slice(0, 5));
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish');
    }
    setIsPublishing(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white" dir={dir}>Offer a ride</h1>
            <p className="text-sm text-[#A0A0A0]">Share your journey and save money</p>
          </div>
        </div>

        {/* Publish Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-6">
          <form onSubmit={handlePublish} className="space-y-4">
            {/* Route */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.from')}
                </Label>
                <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                  <option value="">{t('common.select_city')}</option>
                  {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.to')}
                </Label>
                <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                  <option value="">{t('common.select_city')}</option>
                  {MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.date')}
                </Label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.time')}
                </Label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required />
              </div>
            </div>

            {/* Price & Seats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.price')}
                </Label>
                <Input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" className="bg-[#0F1115] border-white/10 text-white rounded-xl" required />
              </div>
              <div>
                <Label className="text-sm text-[#A0A0A0] mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#FF6B00]" /> {t('driver.seats')}
                </Label>
                <select value={seats} onChange={e => setSeats(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Distance & Duration */}
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

            {/* Publish Button */}
            <Button type="submit" disabled={isPublishing} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl h-13 text-base font-semibold disabled:opacity-50 mt-2 shadow-lg shadow-[#FF6B00]/20">
              {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Publish Ride</>}
            </Button>

            <p className="text-center text-xs text-[#A0A0A0] mt-2">
              By publishing, you agree to our <span className="text-[#FF6B00]">Terms of Service</span>
            </p>
          </form>
        </motion.div>

        {/* Recent Published */}
        {recentTrips.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4">Recently Published</h2>
            <div className="space-y-3">
              {recentTrips.map((trip, idx) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 flex items-center gap-4 cursor-pointer hover:border-[#FF6B00]/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                    <CarFront className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{trip.from_location} &rarr; {trip.to_location}</p>
                    <p className="text-xs text-[#A0A0A0]">{trip.departure_date} &middot; {trip.departure_time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#FF6B00]">{trip.price} MAD</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button onClick={() => navigate('/driver')} variant="outline" className="w-full mt-4 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">
              View All My Rides <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Become Driver CTA */}
        {(!user?.role || user.role === 'passenger') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 bg-[#1B1F27] rounded-2xl border border-[#FF6B00]/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-6 h-6 text-[#FF6B00]" />
              <h2 className="text-lg font-bold text-white">Become a Driver</h2>
            </div>
            <p className="text-sm text-[#A0A0A0] mb-4">
              Want to earn money by sharing your car? Complete your driver profile to unlock all driver features.
            </p>
            <Button onClick={() => navigate('/verification')} className="w-full bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl">
              Start Verification
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
