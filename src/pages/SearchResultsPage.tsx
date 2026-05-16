import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { apiGet } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/data';
import type { Trip } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, MapPin, Clock, Star, Users, Filter, Loader2
} from 'lucide-react';

const LOCAL_TRIPS_KEY = 'wansniauto_trips';

function getLocalTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={() => navigate(`/trip/${trip.id}`)}
      className="bg-[#1B1F27] rounded-2xl border border-white/5 hover:border-[#FF6B00]/30 transition-all cursor-pointer group p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={trip.driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.driver?.name || 'driver'}`} 
            alt={trip.driver?.name} 
            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF6B00]/20 bg-[#1B1F27]" 
          />
          <div>
            <p className="text-sm font-medium text-white">{trip.driver?.name || 'Driver'}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#FF6B00] fill-[#FF6B00]" />
              <span className="text-xs text-[#A0A0A0]">{trip.driver?.rating || 5} &middot; {trip.driver?.trips_count || 0} {t('trip.trips_done')}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#FF6B00]">{trip.price} <span className="text-sm font-normal text-[#A0A0A0]">MAD</span></p>
          <p className="text-xs text-[#A0A0A0]">{t('trip.price')}</p>
        </div>
      </div>
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
          <span className="text-xs text-[#A0A0A0] mt-0.5">{trip.duration}</span>
        </div>
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-lg font-medium text-white">{trip.arrival_time || '??'}</span>
            <div className="w-3 h-3 rounded-full border-2 border-[#FF6B00]" />
          </div>
          <p className="text-sm text-[#A0A0A0] mr-5">{trip.to_location}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">{trip.available_seats} {t('trip.seats_left')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">{trip.distance}</span>
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

  useEffect(() => {
    setIsLoading(true);

    const loadResults = async () => {
      try {
        // Use REST API directly
        const data = await apiGet('trips');
        
        let filtered = (data || []).filter((t: any) => t.status === 'upcoming');
        
        if (searchFilters.from) {
          filtered = filtered.filter((t: any) => 
            t.from_location?.toLowerCase().includes(searchFilters.from.toLowerCase())
          );
        }
        if (searchFilters.to) {
          filtered = filtered.filter((t: any) => 
            t.to_location?.toLowerCase().includes(searchFilters.to.toLowerCase())
          );
        }
        if (searchFilters.date) {
          filtered = filtered.filter((t: any) => t.departure_date === searchFilters.date);
        }
        if (searchFilters.passengers > 0) {
          filtered = filtered.filter((t: any) => (t.available_seats || 0) >= searchFilters.passengers);
        }

        // Enrich with driver data from localStorage
        const localTrips = getLocalTrips();
        const enriched = filtered.map((t: any) => {
          const localTrip = localTrips.find((lt: Trip) => lt.id === t.id);
          return {
            ...t,
            driver: localTrip?.driver || { name: 'Driver', rating: 5, trips_count: 0 },
            ...(!t.duration && { duration: localTrip?.duration || '' }),
            ...(!t.distance && { distance: localTrip?.distance || '' }),
          };
        });

        setResults(enriched);
      } catch {
        // Fallback: search from localStorage only
        const localTrips = getLocalTrips();
        let filtered = localTrips.filter((t: Trip) => t.status === 'upcoming');
        if (searchFilters.from) filtered = filtered.filter(t => t.from_location.toLowerCase().includes(searchFilters.from.toLowerCase()));
        if (searchFilters.to) filtered = filtered.filter(t => t.to_location.toLowerCase().includes(searchFilters.to.toLowerCase()));
        if (searchFilters.date) filtered = filtered.filter(t => t.departure_date === searchFilters.date);
        if (searchFilters.passengers > 0) filtered = filtered.filter(t => (t.available_seats || 0) >= searchFilters.passengers);
        setResults(filtered);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [searchFilters]);

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
