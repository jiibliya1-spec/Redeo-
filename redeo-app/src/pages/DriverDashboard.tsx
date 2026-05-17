import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trip } from '@/types';
import {
  Car, Plus, DollarSign, Star, Users, X, Loader2, MapPin,
  Calendar, Clock, AlertCircle, ChevronRight, TrendingUp, CarFront, Shield,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  seats: number;
  driver_id?: string;
}

function VehicleManager({ vehicles, onAdd, onRemove, isLoading }: {
  vehicles: Vehicle[];
  onAdd: (v: Omit<Vehicle, 'id' | 'driver_id'>) => void;
  onRemove: (id: string) => void;
  isLoading: boolean;
}) {
  const { t } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!make || !model || !plate) return;
    setSaving(true);
    await onAdd({ make, model, year: parseInt(year) || new Date().getFullYear(), color, plate_number: plate, seats: 4 });
    setSaving(false);
    setShowAdd(false);
    setMake(''); setModel(''); setYear(''); setColor(''); setPlate('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('driver.vehicle_info')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-[#FF6B00] hover:underline">
          {showAdd ? t('common.cancel') : '+ Add Vehicle'}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
            <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Make (e.g. Toyota)" value={make} onChange={e => setMake(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder="Model (e.g. Camry)" value={model} onChange={e => setModel(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Year" type="number" value={year} onChange={e => setYear(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder="Color" value={color} onChange={e => setColor(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
                <Input placeholder="Plate" value={plate} onChange={e => setPlate(e.target.value)} className="bg-[#0F1115] border-white/10 text-white rounded-xl text-sm h-9" />
              </div>
              <Button onClick={handleAdd} disabled={saving || !make || !model || !plate} size="sm" className="bg-[#FF6B00] text-white rounded-xl text-xs w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" /></div>
      ) : (
        <div className="space-y-2">
          {vehicles.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
                <CarFront className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{v.make} {v.model}</p>
                <p className="text-xs text-[#A0A0A0]">{v.year} · {v.color} · {v.plate_number}</p>
              </div>
              <button onClick={() => onRemove(v.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="text-center py-4 bg-white/5 rounded-xl">
              <CarFront className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
              <p className="text-xs text-[#A0A0A0]">No vehicles added yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { t, dir } = useI18n();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const [totalEarnings, setTotalEarnings] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalPassengers, setTotalPassengers] = useState(0);

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
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'vehicles'>('upcoming');

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
  }, [user?.id]);

  async function loadAll() {
    setLoading(true);
    setVehiclesLoading(true);
    try {
      const [tripsResult, vehiclesResult, bookingsResult] = await Promise.all([
        supabase.from('trips').select('*, vehicle:vehicle_profiles(*)').eq('driver_id', user!.id).order('departure_date', { ascending: false }),
        supabase.from('vehicle_profiles').select('*').eq('driver_id', user!.id),
        supabase.from('bookings').select('total_price, seats').eq('driver_id', user!.id).eq('status', 'confirmed'),
      ]);

      const tripsData = tripsResult.data ?? [];
      setTrips(tripsData as Trip[]);
      setTotalTrips(tripsData.length);
      setAvgRating(user?.rating || 5);

      const vehiclesData = vehiclesResult.data ?? [];
      setVehicles(vehiclesData as Vehicle[]);
      if (vehiclesData.length > 0) setSelectedVehicleId(vehiclesData[0].id);

      const bookingsData = bookingsResult.data ?? [];
      const earnings = bookingsData.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const passengers = bookingsData.reduce((sum, b) => sum + (b.seats || 0), 0);
      setTotalEarnings(earnings);
      setTotalPassengers(passengers);
    } catch (e) {
      console.error('loadAll error:', e);
    } finally {
      setLoading(false);
      setVehiclesLoading(false);
    }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const isVerified = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved';
    if (!isVerified) { setShowVerifyAlert(true); return; }

    if (from === to) { toast.error('Departure and arrival must be different'); return; }

    setIsPublishing(true);
    try {
      const tripData: any = {
        driver_id: user.id,
        from_location: from,
        to_location: to,
        departure_date: date,
        departure_time: time,
        arrival_time: '',
        price: parseFloat(price),
        available_seats: parseInt(seats),
        total_seats: parseInt(seats),
        distance: distance || '',
        duration: duration || '',
        status: 'upcoming',
        route: [from, to],
        amenities: ['Air Conditioning'],
      };

      if (selectedVehicleId) tripData.vehicle_id = selectedVehicleId;

      const { data, error } = await supabase.from('trips').insert(tripData).select().single();
      if (error) throw error;

      setTrips(prev => [data as Trip, ...prev]);
      setTotalTrips(prev => prev + 1);
      toast.success('Trip published successfully!');
      setShowPublish(false);
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3'); setDistance(''); setDuration('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish trip');
    }
    setIsPublishing(false);
  };

  const handleAddVehicle = async (v: Omit<Vehicle, 'id' | 'driver_id'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('vehicle_profiles')
      .insert({ ...v, driver_id: user.id })
      .select()
      .single();
    if (error) { toast.error('Failed to add vehicle: ' + error.message); return; }
    setVehicles(prev => [...prev, data as Vehicle]);
    if (!selectedVehicleId) setSelectedVehicleId(data.id);
    toast.success('Vehicle added!');
  };

  const handleRemoveVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicle_profiles').delete().eq('id', id);
    if (error) { toast.error('Failed to remove vehicle'); return; }
    setVehicles(prev => prev.filter(v => v.id !== id));
    if (selectedVehicleId === id) setSelectedVehicleId(vehicles.find(v => v.id !== id)?.id || '');
  };

  const now = new Date().toISOString().split('T')[0];
  const upcomingTrips = trips.filter(t => t.departure_date >= now && t.status !== 'cancelled');
  const pastTrips = trips.filter(t => t.departure_date < now || t.status === 'completed' || t.status === 'cancelled');

  const stats = [
    { label: t('driver.earnings'), value: `${totalEarnings.toFixed(0)} MAD`, icon: DollarSign },
    { label: t('driver.rating'), value: `${avgRating}/5`, icon: Star },
    { label: t('driver.trips'), value: totalTrips, icon: TrendingUp },
    { label: t('driver.passengers'), value: totalPassengers, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-24">
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
                <Button onClick={() => setShowVerifyAlert(false)} variant="outline" className="flex-1 border-white/10 text-white rounded-xl">{t('common.cancel')}</Button>
                <Button onClick={() => { setShowVerifyAlert(false); navigate('/verification'); }} className="flex-1 bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl">{t('verify.title')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      <option value="">Select city</option>
                      {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.to')}</Label>
                    <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required>
                      <option value="">Select city</option>
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
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.price')} (MAD)</Label>
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
                    <Input value={distance} onChange={e => setDistance(e.target.value)} placeholder="240 km" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">{t('driver.duration')}</Label>
                    <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="2h 30min" className="bg-[#0F1115] border-white/10 text-white rounded-xl" />
                  </div>
                </div>

                {vehicles.length > 0 && (
                  <div>
                    <Label className="text-sm text-[#A0A0A0] mb-1.5 block">Vehicle</Label>
                    <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.plate_number}</option>)}
                    </select>
                  </div>
                )}

                {vehicles.length === 0 && (
                  <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span className="text-xs text-yellow-400">Please add a vehicle first in the Vehicles tab</span>
                  </div>
                )}

                <Button type="submit" disabled={isPublishing} className="w-full bg-[#FF6B00] text-white rounded-xl h-12 font-semibold disabled:opacity-50 mt-2">
                  {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : t('driver.publish_btn')}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" dir={dir}>{t('driver.title')}</h1>
            <p className="text-sm text-[#A0A0A0] mt-1">{t('driver.subtitle')}</p>
          </div>
          <Button
            onClick={() => {
              const isVerified = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved';
              if (!isVerified) { setShowVerifyAlert(true); return; }
              setShowPublish(true);
            }}
            className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl shadow-lg shadow-[#FF6B00]/20"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('driver.publish')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, idx) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <s.icon className="w-5 h-5 text-[#FF6B00] mb-2" />
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-[#A0A0A0]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl mb-6 border border-white/5">
          {([
            { key: 'upcoming' as const, label: t('passenger.upcoming') },
            { key: 'past' as const, label: t('passenger.past') },
            { key: 'vehicles' as const, label: 'Vehicles' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#A0A0A0] hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 overflow-hidden">
          {activeTab === 'upcoming' && (
            <div>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('passenger.upcoming')}</h3>
                <span className="text-xs text-[#A0A0A0]">{upcomingTrips.length} trips</span>
              </div>
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#FF6B00] mx-auto" /><p className="text-sm text-[#A0A0A0] mt-2">{t('common.loading')}</p></div>
              ) : upcomingTrips.length === 0 ? (
                <div className="p-8 text-center">
                  <Car className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0A0A0] mb-2">{t('driver.no_trips')}</p>
                  <Button onClick={() => { const ok = user?.is_verified || user?.verification_status === 'verified' || user?.verification_status === 'approved'; if (!ok) { setShowVerifyAlert(true); return; } setShowPublish(true); }} variant="outline" className="mt-2 border-[#FF6B00]/30 text-[#FF6B00] rounded-xl">
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
                          <p className="text-sm text-white font-medium truncate">{trip.from_location} → {trip.to_location}</p>
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

          {activeTab === 'past' && (
            <div>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">{t('passenger.past')}</h3>
                <span className="text-xs text-[#A0A0A0]">{pastTrips.length} trips</span>
              </div>
              {pastTrips.length === 0 ? (
                <div className="p-8 text-center"><Clock className="w-12 h-12 text-[#A0A0A0] mx-auto mb-3" /><p className="text-sm text-[#A0A0A0]">{t('passenger.no_past')}</p></div>
              ) : (
                <div className="divide-y divide-white/5">
                  {pastTrips.map((trip, idx) => (
                    <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} onClick={() => navigate(`/trip/${trip.id}`)} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer opacity-60">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-[#A0A0A0]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{trip.from_location} → {trip.to_location}</p>
                        <p className="text-xs text-[#A0A0A0]">{trip.departure_date} · {trip.price} MAD</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${trip.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-[#A0A0A0]'}`}>{trip.status}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="p-5">
              <VehicleManager vehicles={vehicles} onAdd={handleAddVehicle} onRemove={handleRemoveVehicle} isLoading={vehiclesLoading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
