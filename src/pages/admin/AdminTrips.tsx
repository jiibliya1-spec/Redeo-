import { useState, useEffect } from 'react';
// motion
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Car, MapPin, Calendar, DollarSign, Users, Loader2, Search } from 'lucide-react';

interface TripRecord {
  id: string;
  driver_id: string;
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  price: number;
  available_seats: number;
  total_seats: number;
  status: string;
  created_at: string;
  driver_name: string;
  driver_avatar: string;
}

export function AdminTrips() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [filtered, setFiltered] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    let result = trips;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.from_location.toLowerCase().includes(q) ||
          t.to_location.toLowerCase().includes(q) ||
          t.driver_name.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [trips, search]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { data: tripsData } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      const { data: drivers } = await supabase.from('profiles').select('id, name, avatar');

      const combined = (tripsData || []).map((t: any) => {
        const driver = drivers?.find((d: any) => d.id === t.driver_id);
        return {
          ...t,
          driver_name: driver?.name || 'Unknown',
          driver_avatar: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.driver_id}`,
        };
      });

      setTrips(combined);
    } catch (err) {
      console.error('Load trips error:', err);
    }
    setLoading(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400';
      case 'ongoing': return 'bg-yellow-500/10 text-yellow-400';
      case 'completed': return 'bg-green-500/10 text-green-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      default: return 'bg-white/5 text-[#A0A0A0]';
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Trip Management</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">All published trips</p>
        </div>
        <p className="text-sm text-[#A0A0A0]">{trips.length} total trips</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by route or driver..."
          className="pl-11 bg-[#111318] border-white/5 text-white rounded-xl h-11"
        />
      </div>

      <div className="bg-[#111318] rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Car className="w-10 h-10 text-[#A0A0A0] mb-3" />
            <p className="text-sm text-[#A0A0A0]">No trips found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Driver</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Route</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Date & Time</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Price</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Seats</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((trip) => (
                  <tr key={trip.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={trip.driver_avatar} alt="" className="w-9 h-9 rounded-full bg-[#1B1F27]" />
                        <span className="text-sm text-white">{trip.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                        {trip.from_location}
                        <span className="text-[#A0A0A0]">→</span>
                        {trip.to_location}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#A0A0A0]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {trip.departure_date} · {trip.departure_time}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-white font-medium">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-[#FF6B00]" />
                        {trip.price} MAD
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#A0A0A0]">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {trip.available_seats}/{trip.total_seats}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusColor(trip.status)}`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
