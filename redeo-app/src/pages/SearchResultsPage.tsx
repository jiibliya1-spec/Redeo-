import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet, supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import type { Trip, User } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, MapPin, Clock, Star, Users, Filter, Loader2,
  ShieldCheck,
} from 'lucide-react';

const SUPABASE_URL = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTIwNDcsImV4cCI6MjA5NDM2ODA0N30.04MftiDjQUrnGegTeaL88WyES9ydDKxRrrmVua0rVbM';

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const driver = trip.driver;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={() => navigate(`/trip/${trip.id}`)}
      className="bg-[#1B1F27] rounded-2xl border border-white/5 hover:border-[#FF6B00]/30 transition-all cursor-pointer group p-5"
    >
      {/* Driver Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.name || 'driver'}`}
              alt={driver?.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF6B00]/20 bg-[#1B1F27]"
            />
            {driver?.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">{driver?.name || 'Driver'}</p>
              {driver?.is_verified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Verified</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#FF6B00] fill-[#FF6B00]" />
              <span className="text-xs text-[#A0A0A0]">{driver?.rating || 5} &middot; {driver?.trips_count || 0} {t('trip.trips_done')}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#FF6B00]">{trip.price} <span className="text-sm font-normal text-[#A0A0A0]">MAD</span></p>
          <p className="text-xs text-[#A0A0A0]">{t('trip.price')}</p>
        </div>
      </div>

      {/* Route Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#FF6B00]" />
            <span className="text-lg font-medium text-white">{trip.departure_time}</span>
          </div>
          <p className="text-sm text-[#A0A0A0] ml-5">{trip.from_location}</p>
        </div>
        <div className="flex flex-col items-center px-2">
          <Clock className="w-4 h-4 text-[#A0A0A0]" />
          <span className="text-xs text-[#A0A0A0] mt-0.5">{trip.duration || '—'}</span>
        </div>
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-lg font-medium text-white">{trip.arrival_time || '??'}</span>
            <div className="w-3 h-3 rounded-full border-2 border-[#FF6B00]" />
          </div>
          <p className="text-sm text-[#A0A0A0] mr-5">{trip.to_location}</p>
        </div>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">{trip.available_seats} {t('trip.seats_left')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">{trip.distance || '—'}</span>
          </div>
        </div>
        <span className="text-xs text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-1 rounded-full font-medium capitalize">{trip.status}</span>
      </div>
    </motion.div>
  );
}

export function SearchResultsPage() {
  const navigate = useNavigate();
  const { searchFilters, setSearchFilters } = useStore();
  const { t, dir } = useI18n();
  const [results, setResults] = useState<Trip[]>([]);
  const [sortBy, setSortBy] = useState('price');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);

  // ─── Fetch driver profiles for trips ───
  const enrichTripsWithDrivers = useCallback(async (trips: Trip[]): Promise<Trip[]> => {
    const driverIds = [...new Set(trips.map(t => t.driver_id).filter(Boolean))];
    if (driverIds.length === 0) return trips;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token || '';

      // Fetch all driver profiles in one batch
      const idsFilter = driverIds.map(id => `id=eq.${id}`).join(',');
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,avatar,bio,phone,is_verified,verification_status,rating,trips_count,role&or=(${idsFilter})&limit=500`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${jwt}`,
          },
        }
      );

      if (res.ok) {
        const profiles = await res.json();
        const profileMap = new Map<string, any>();
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

        return trips.map(trip => {
          const dp = profileMap.get(trip.driver_id);
          if (dp) {
            return {
              ...trip,
              driver: {
                id: dp.id,
                name: dp.name,
                email: dp.email,
                avatar: dp.avatar,
                role: 'driver' as const,
                is_verified: dp.is_verified,
                verification_status: dp.verification_status,
                rating: dp.rating,
                trips_count: dp.trips_count,
                bio: dp.bio,
              } as User,
            };
          }
          return trip;
        });
      }
    } catch (err) {
      console.error('[SearchResults] Driver fetch error:', err);
    }

    return trips;
  }, []);

  // ─── Load and filter trips ───
  const loadResults = useCallback(async () => {
    setIsLoading(true);
    let allTrips: Trip[] = [];

    try {
      const data = await apiGet('trips');
      if (data && data.length > 0) {
        allTrips = data as Trip[];
      }
    } catch (e) {
      console.error('[SearchResults] Failed to fetch trips:', e);
    }

    // Filter
    let filtered = allTrips.filter((t: Trip) => t.status === 'upcoming');
    if (searchFilters.from) {
      filtered = filtered.filter((t: Trip) =>
        t.from_location?.toLowerCase().includes(searchFilters.from.toLowerCase())
      );
    }
    if (searchFilters.to) {
      filtered = filtered.filter((t: Trip) =>
        t.to_location?.toLowerCase().includes(searchFilters.to.toLowerCase())
      );
    }
    if (searchFilters.date) {
      filtered = filtered.filter((t: Trip) => t.departure_date === searchFilters.date);
    }
    if (searchFilters.passengers > 0) {
      filtered = filtered.filter((t: Trip) => (t.available_seats || 0) >= searchFilters.passengers);
    }

    const enriched = await enrichTripsWithDrivers(filtered);
    setResults(enriched);
    setIsLoading(false);
  }, [searchFilters, enrichTripsWithDrivers]);

  useEffect(() => { loadResults(); }, [loadResults, lastUpdated]);

  // ─── Realtime: auto-refresh when a trip is added/updated/deleted ───
  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime-search')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => { setLastUpdated(Date.now()); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'time') return a.departure_time.localeCompare(b.departure_time);
    if (sortBy === 'rating') return (b.driver?.rating || 0) - (a.driver?.rating || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-[#A0A0A0]" /></button>
          <div>
            <h1 className="text-xl font-bold text-white" dir={dir}>{searchFilters.from || t('search.all_cities')} <span className="text-[#A0A0A0] font-normal">{t('search.to')}</span> {searchFilters.to || t('search.all_cities')}</h1>
            <p className="text-sm text-[#A0A0A0]" dir={dir}>{sorted.length} {t('search.rides_available')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={searchFilters.from} onChange={e => setSearchFilters({ ...searchFilters, from: e.target.value })} className="bg-[#0F1115] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
              <option value="">{t('search.from_label')}</option>
              {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={searchFilters.to} onChange={e => setSearchFilters({ ...searchFilters, to: e.target.value })} className="bg-[#0F1115] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
              <option value="">{t('search.to_label')}</option>
              {MOROCCAN_CITIES.filter(c => c !== searchFilters.from).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={searchFilters.date} onChange={e => setSearchFilters({ ...searchFilters, date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="bg-[#0F1115] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none focus:border-[#FF6B00]/50" />
            <select value={String(searchFilters.passengers)} onChange={e => setSearchFilters({ ...searchFilters, passengers: Number(e.target.value) })} className="bg-[#0F1115] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none focus:border-[#FF6B00]/50 appearance-none">
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {t('search.pax')}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-[#A0A0A0]" /><span className="text-sm text-[#A0A0A0]" dir={dir}>{t('search.sort')}</span></div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#1B1F27] border border-white/10 text-white rounded-xl h-9 px-3 text-sm outline-none appearance-none">
            <option value="price">{t('search.lowest_price')}</option>
            <option value="time">{t('search.earliest')}</option>
            <option value="rating">{t('search.highest_rated')}</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {sorted.length > 0 ? sorted.map((trip, i) => <TripCard key={trip.id} trip={trip} index={i} />) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-[#FF6B00]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2" dir={dir}>{t('search.no_rides')}</h3>
                <p className="text-sm text-[#A0A0A0] mb-4" dir={dir}>{t('search.try_adjust')}</p>
                <Button onClick={() => setSearchFilters({ from: '', to: '', date: '', passengers: 1 })} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">{t('search.clear_filters')}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
