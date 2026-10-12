import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { resolveAvatar } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Car, MapPin, Calendar, DollarSign, Users, Loader2, Search,
  Trash2, Ban, ChevronRight,
} from 'lucide-react';


import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
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

type StatusFilter = 'all' | 'upcoming' | 'ongoing' | 'in_progress' | 'completed' | 'cancelled';

export function AdminTrips() {
  const { t } = useI18n();
  const city = useCity();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [filtered, setFiltered] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token || '';
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();

      const [tripsRes, usersRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/trips?select=*&order=created_at.desc&limit=500`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,avatar&limit=500`, { headers }),
      ]);

      if (!tripsRes.ok) throw new Error('Status ' + tripsRes.status + ': ' + await tripsRes.text());

      const [tripsData, usersData] = await Promise.all([
        tripsRes.json(),
        usersRes.ok ? usersRes.json() : [],
      ]);

      // O(1) driver lookup with Map
      const usersMap = new Map<string, any>((usersData || []).map((u: any) => [u.id, u]));

      const combined = (tripsData || []).map((t: any) => {
        const driver = usersMap.get(t.driver_id);
        return {
          ...t,
          driver_name: driver?.name || t('adm.unknown'),
          driver_avatar: resolveAvatar(driver?.avatar, t.driver_id),
        };
      });

      setTrips(combined);
    } catch (err: any) {
      toast.error(t('adm.err_load') + ': ' + err.message);
    }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        loadTrips();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadTrips]);

  useEffect(() => {
    let result = trips;
    if (statusFilter !== 'all') {
      result = result.filter((t) => {
        if (statusFilter === 'ongoing') return t.status === 'ongoing' || t.status === 'in_progress';
        return t.status === statusFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.from_location?.toLowerCase().includes(q) ||
          t.to_location?.toLowerCase().includes(q) ||
          t.driver_name?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [trips, search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trip permanently?')) return;
    setProcessingId(id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/trips?id=eq.${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('adm.trip_deleted_9236'));
      await loadTrips();
    } catch (err: any) {
      toast.error(t('adm.err_delete') + ': ' + err.message);
    }
    setProcessingId(null);
  };

  const handleCancel = async (id: string) => {
    setProcessingId(id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/trips?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('adm.trip_cancelled_b71f'));
      await loadTrips();
    } catch (err: any) {
      toast.error(t('adm.err_cancel') + ': ' + err.message);
    }
    setProcessingId(null);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400';
      case 'ongoing':
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-400';
      case 'completed': return 'bg-green-500/10 text-green-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      default: return 'bg-white/5 text-[#A0A0A0]';
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'in_progress' || s === 'ongoing') return t('adm.st_active');
    const k = 'adm.st_' + s;
    return ['upcoming','completed','cancelled'].includes(s) ? t(k) : s.charAt(0).toUpperCase() + s.slice(1);
  };

  const counts = {
    all: trips.length,
    upcoming: trips.filter(t => t.status === 'upcoming').length,
    ongoing: trips.filter(t => t.status === 'ongoing' || t.status === 'in_progress').length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{t('adm.trip_management_8d1a')}</h2>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{t('adm.all_published_trips_from_all_drivers_6012')}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#A0A0A0]">{t('adm.trips_total',{n:trips.length})}</p>
          <Button onClick={loadTrips} variant="outline" size="sm" className="border-white/10 text-[#A0A0A0] rounded-xl">
            <Loader2 className="w-3 h-3 mr-1" /> {t('adm.refresh')}
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: 'all' as StatusFilter, label: t('adm.all_b1c9'), count: counts.all, color: 'bg-white/5 text-[#A0A0A0]' },
          { key: 'upcoming' as StatusFilter, label: t('adm.upcoming_14ab'), count: counts.upcoming, color: 'bg-blue-500/10 text-blue-400' },
          { key: 'ongoing' as StatusFilter, label: t('adm.active_4d3d'), count: counts.ongoing, color: 'bg-yellow-500/10 text-yellow-400' },
          { key: 'completed' as StatusFilter, label: t('adm.completed_07ca'), count: counts.completed, color: 'bg-green-500/10 text-green-400' },
          { key: 'cancelled' as StatusFilter, label: t('adm.cancelled_a149'), count: counts.cancelled, color: 'bg-red-500/10 text-red-400' },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === tab.key ? `${tab.color} ring-1 ring-current` : 'text-[#A0A0A0] hover:bg-white/5'
            }`}>
            {tab.label} <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adm.search_by_route_or_driver_955d')}
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
            <p className="text-sm text-[#A0A0A0]">{t('adm.no_trips_found_12bc')}</p>
            <p className="text-xs text-[#A0A0A0] mt-1">
              {t(trips.length > 0 ? 'adm.try_filter' : 'adm.trips_appear')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.driver_48cf')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.route_9405')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.date_4474')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.price_3601')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.seats_b29f')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.status_ec53')}</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-[#A0A0A0] uppercase">{t('adm.actions_06df')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((trip) => (
                  <tr key={trip.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={trip.driver_avatar} alt="" className="w-8 h-8 rounded-full bg-[#1B1F27]" />
                        <span className="text-sm text-white">{trip.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-white">
                        <MapPin className="w-3 h-3 text-[#FF6B00] shrink-0" />
                        <span className="truncate max-w-[80px]">{city(trip.from_location)}</span>
                        <ChevronRight className="w-3 h-3 text-[#A0A0A0] shrink-0" />
                        <span className="truncate max-w-[80px]">{city(trip.to_location)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {trip.departure_date} · {trip.departure_time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      <div className="flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3 text-[#FF6B00]" />
                        {trip.price} {t('adm.mad')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A0A0A0]">
                      <div className="flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {trip.available_seats}/{trip.total_seats}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(trip.status)}`}>
                        {statusLabel(trip.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                          <>
                            <button onClick={() => handleCancel(trip.id)} disabled={processingId === trip.id}
                              className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors" title={t('adm.cancel_trip_6203')}>
                              {processingId === trip.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(trip.id)} disabled={processingId === trip.id}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title={t('adm.delete_trip_5b97')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
