import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { MOCK_TRIPS, MOROCCAN_CITIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Car, Plus, DollarSign, Star, Users, X, Loader2 } from 'lucide-react';

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [showPublish, setShowPublish] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('3');
  const [isPublishing, setIsPublishing] = useState(false);

  const myTrips = MOCK_TRIPS.filter(t => t.driver_id === user?.id || t.driver_id === 'u1');
  const totalEarnings = myTrips.reduce((s, t) => s + (t.total_seats - t.available_seats) * t.price, 0);

  const stats = [
    { label: 'Earnings', value: totalEarnings, icon: DollarSign, prefix: 'MAD' },
    { label: 'Rating', value: user?.rating || 4.8, icon: Star, suffix: '/5' },
    { label: 'Trips', value: myTrips.length, icon: Car },
    { label: 'Passengers', value: 156, icon: Users },
  ];

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setTimeout(() => {
      toast.success('Trip published successfully!');
      setShowPublish(false);
      setIsPublishing(false);
      setFrom(''); setTo(''); setDate(''); setTime(''); setPrice(''); setSeats('3');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Driver Dashboard</h1>
            <p className="text-sm text-[#A0A0A0] mt-1">Manage your rides and earnings</p>
          </div>
          <Button onClick={() => setShowPublish(true)} className="bg-[#FF6B00] text-white hover:bg-[#E56000] rounded-xl"><Plus className="w-4 h-4 mr-2" /> Publish Trip</Button>
        </div>

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
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">From</Label><select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required><option value="">City</option>{MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">To</Label><select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none" required><option value="">City</option>{MOROCCAN_CITIES.filter(c => c !== from).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">Date</Label><input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required /></div>
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">Time</Label><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full h-11 px-3 bg-[#0F1115] border border-white/10 text-white rounded-xl text-sm outline-none" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">Price (MAD)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" className="bg-[#0F1115] border-white/10 text-white rounded-xl" required /></div>
                  <div><Label className="text-sm text-[#A0A0A0] mb-1.5 block">Seats</Label><select value={seats} onChange={e => setSeats(e.target.value)} className="w-full bg-[#0F1115] border border-white/10 text-white rounded-xl h-11 px-3 text-sm outline-none appearance-none">{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
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
          <div className="p-5 border-b border-white/5"><h3 className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">My Published Trips</h3></div>
          <div className="divide-y divide-white/5">
            {myTrips.map((trip, i) => (
              <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/trip/${trip.id}`)} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-[#FF6B00]" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{trip.from_location} &rarr; {trip.to_location}</p>
                  <p className="text-xs text-[#A0A0A0]">{trip.departure_date} &middot; {trip.departure_time}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-[#FF6B00] font-bold">{trip.price} MAD</p>
                  <p className="text-xs text-[#A0A0A0]">{trip.available_seats}/{trip.total_seats} seats</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${trip.status === 'upcoming' ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : trip.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{trip.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
