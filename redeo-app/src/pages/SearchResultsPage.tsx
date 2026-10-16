import { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasDeparted } from '@/lib/tripTime';
import { cityLabel } from '@/lib/cities';
import { cityCoords } from '@/lib/cityCoords';
import { RatingBadge } from '@/components/Rating';
import { resolveAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { TripAlertForm } from '@/components/TripAlertForm';
import { apiGet, supabase } from '@/lib/supabase';
import { CityPicker } from '@/components/CityPicker';
import type { Trip, User } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, SlidersHorizontal, Loader2, ShieldCheck } from 'lucide-react';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

type LL = [number, number];
type RouteData = { pts: LL[]; km: number; sec: number };
const ROUTE_MEM = new Map<string, RouteData>();
const ROUTE_SERVERS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
];

/** Real driving route between two points (public OSRM servers, cached per pair). Returns null if unreachable. */
async function fetchRoute(a: LL, b: LL, signal: AbortSignal): Promise<RouteData | null> {
  const key = `${a.join(',')}|${b.join(',')}`;
  const mem = ROUTE_MEM.get(key);
  if (mem) return mem;
  try { const c = sessionStorage.getItem('redeo-route:' + key); if (c) { const r = JSON.parse(c) as RouteData; ROUTE_MEM.set(key, r); return r; } } catch { /* ignore */ }
  for (const base of ROUTE_SERVERS) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 9000);
      const onAbort = () => ctrl.abort();
      signal.addEventListener('abort', onAbort);
      const res = await fetch(`${base}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`, { signal: ctrl.signal });
      clearTimeout(timer); signal.removeEventListener('abort', onAbort);
      if (!res.ok) continue;
      const j = await res.json();
      const r0 = j?.routes?.[0];
      if (!r0) continue;
      let pts = (r0.geometry.coordinates as [number, number][]).map(([lng, lat]) => [Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4] as LL);
      if (pts.length > 2500) { const step = Math.ceil(pts.length / 2500); pts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
      const out: RouteData = { pts, km: r0.distance / 1000, sec: r0.duration };
      ROUTE_MEM.set(key, out);
      try { sessionStorage.setItem('redeo-route:' + key, JSON.stringify(out)); } catch { /* ignore */ }
      return out;
    } catch (e) { if (signal.aborted) return null; }
  }
  return null;
}

const fmtDur = (sec: number) => { const m = Math.round(sec / 60); const h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function chipHtml(time: string, main: string, sub: string | undefined, above: boolean, timeBg: string) {
  return `<div style="position:absolute;left:0;top:0;transform:translate(-50%,${above ? 'calc(-100% - 20px)' : '20px'})"><div style="display:flex;align-items:stretch;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.3);white-space:nowrap;font-family:inherit"><div style="background:${timeBg};color:#fff;padding:6px 10px;font-weight:700;font-size:13px;display:flex;align-items:center">${esc(time)}</div><div style="background:#fff;color:#0F1115;padding:5px 11px"><div style="font-weight:700;font-size:13px;line-height:1.3">${esc(main)}</div>${sub ? `<div style="font-size:11px;color:#6B7280;line-height:1.3">${esc(sub)}</div>` : ''}</div></div></div>`;
}

type Snap = 'peek' | 'half' | 'full';
const SNAP_H: Record<Snap, string> = { peek: '236px', half: '46%', full: '92%' };

function OfferRow({ trip, selected, onSelect }: { trip: Trip; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  const d = trip.driver;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-start flex items-center gap-3 rounded-2xl p-3 border-2 transition-colors ${selected ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-transparent bg-[#1B1F27] hover:bg-[#222733]'}`}
    >
      <div className="relative shrink-0">
        <img src={resolveAvatar(d?.avatar, d?.id || trip.driver_id)} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF6B00]/20 bg-[#0F1115]" />
        {d?.is_verified && (
          <span className="absolute -bottom-0.5 -end-0.5 w-[18px] h-[18px] bg-green-500 rounded-full flex items-center justify-center"><ShieldCheck className="w-3 h-3 text-white" /></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-white leading-tight" dir="ltr" style={{ textAlign: 'start' }}>
          {trip.departure_time}<span className="text-[#A0A0A0] font-normal"> → {trip.arrival_time || '—'}</span>
        </p>
        <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0] mt-0.5 min-w-0">
          <span className="truncate">{d?.name || 'Driver'}</span>
          <RatingBadge rating={d?.rating} count={(d as any)?.rating_count} />
        </div>
        <p className="text-xs text-[#A0A0A0] mt-0.5">{trip.available_seats} {t('trip.seats_left')}{trip.duration ? ` · ${trip.duration}` : ''}{trip.women_only ? <span className="ms-1.5 px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-semibold">{t('trip.women_only')}</span> : null}</p>
      </div>
      <p className="text-lg font-bold text-[#FF6B00] shrink-0 text-end leading-tight">{trip.price}<span className="block text-[11px] font-normal text-[#A0A0A0]">{t('trip.price')}</span></p>
    </button>
  );
}

export function SearchResultsPage() {
  const lang = useStore((s) => s.language);
  const isAuth = useStore((s) => s.isAuthenticated);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>('half');
  const [showFilters, setShowFilters] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useRef<number | null>(null);
  const navigate = useNavigate();
  const { searchFilters, setSearchFilters } = useStore();
  const { t, dir } = useI18n();
  const [results, setResults] = useState<Trip[]>([]);
  const [sortBy, setSortBy] = useState('price');
  const [womenOnly, setWomenOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const hasFilters = !!(searchFilters.from || searchFilters.to || searchFilters.date);

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
        `${SUPABASE_URL}/rest/v1/public_profiles?select=id,name,avatar,bio,is_verified,verification_status,rating,rating_count,trips_count,role&or=(${idsFilter})&limit=500`,
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
                avatar: dp.avatar,
                role: 'driver' as const,
                is_verified: dp.is_verified,
                verification_status: dp.verification_status,
                rating: dp.rating,
                rating_count: dp.rating_count,
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
      // Filter on the server: only upcoming trips from yesterday on (timezone-safe), capped, never the whole table.
      const y = new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);
      const params: Record<string, string> = { status: 'eq.upcoming', departure_date: searchFilters.date ? `eq.${searchFilters.date}` : `gte.${y}` };
      if (searchFilters.passengers > 0) params.available_seats = `gte.${searchFilters.passengers}`;
      const data = await apiGet('trips', { params, order: 'departure_date', limit: 300 });
      if (data && data.length > 0) {
        allTrips = data as Trip[];
      }
    } catch (e) {
      console.error('[SearchResults] Failed to fetch trips:', e);
    }

    // Filter
    let filtered = allTrips.filter((t: Trip) => t.status === 'upcoming' && !hasDeparted(t));
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
    // Search-success metric (fire and forget; table may not exist yet)
    try {
      const { data: sess } = await supabase.auth.getSession();
      void supabase.from('search_logs').insert({ user_id: sess.session?.user.id ?? null, from_location: searchFilters.from || null, to_location: searchFilters.to || null, results_count: enriched.length }).then(() => {}, () => {});
    } catch { /* ignore */ }
    setResults(enriched);
    setIsLoading(false);
  }, [searchFilters, enrichTripsWithDrivers]);

  useEffect(() => {
    if (hasFilters) {
      loadResults();
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [loadResults, lastUpdated, hasFilters]);

  const refreshTimer = useRef<number | null>(null);
  // ─── Realtime: auto-refresh when a trip is added/updated/deleted ───
  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime-search')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          // Throttle: at most one refresh every 20s, so a busy platform doesn't make every open search page re-query on each change.
          if (refreshTimer.current) return;
          refreshTimer.current = window.setTimeout(() => { refreshTimer.current = null; setLastUpdated(Date.now()); }, 20000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); if (refreshTimer.current) { clearTimeout(refreshTimer.current); refreshTimer.current = null; } };
  }, []);

  const sorted = [...results].filter((x) => !womenOnly || x.women_only).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'time') return a.departure_time.localeCompare(b.departure_time);
    if (sortBy === 'rating') return (b.driver?.rating || 0) - (a.driver?.rating || 0);
    return 0;
  });


  const selected = sorted.find((x) => x.id === selectedId) || sorted[0] || null;
  const from = selected ? cityCoords(selected.from_location) : null;
  const to = selected ? cityCoords(selected.to_location) : null;
  const pairKey = from && to ? `${from.join(',')}|${to.join(',')}` : '';

  // keep a valid selection when the list changes
  useEffect(() => {
    if (sorted.length && !sorted.some((x) => x.id === selectedId)) setSelectedId(sorted[0].id);
  }, [sorted, selectedId]);
  useEffect(() => { if (!hasFilters) { setShowFilters(true); setSnap('full'); } }, [hasFilters]);

  // ─── Map init ───
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
    m.fitBounds([[27.6, -13.5], [35.9, -1.0]]);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    m.attributionControl.setPosition('topright');
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const onResize = () => m.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); m.remove(); map.current = null; layer.current = null; };
  }, []);

  // ─── Real driving route for the selected offer ───
  useEffect(() => {
    setRoute(null);
    if (!from || !to) return;
    const ctrl = new AbortController();
    fetchRoute(from, to, ctrl.signal).then((r) => { if (!ctrl.signal.aborted) setRoute(r); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairKey]);

  const fit = useCallback(() => {
    const m = map.current;
    if (!m) return;
    m.invalidateSize();
    const sheetH = sheetRef.current?.offsetHeight || 260;
    const desktop = window.innerWidth >= 768;
    const rtl = dir === 'rtl';
    const side = desktop ? 460 : 36;
    const pts: LL[] = from && to ? (route ? route.pts : [from, to]) : [[27.6, -13.5], [35.9, -1.0]];
    const has = !!(from && to);
    m.fitBounds(L.latLngBounds(pts), {
      paddingTopLeft: [rtl && desktop ? 40 : side, has ? 100 : 30],
      paddingBottomRight: [rtl && desktop ? side : 40, desktop ? 80 : sheetH + (has ? 80 : 20)],
      maxZoom: has ? 11 : 6, animate: true,
    });
  }, [from, to, route, dir]);

  // ─── Draw route + markers ───
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    if (!selected || !from || !to) { fit(); return; }
    const pts: LL[] = route ? route.pts : [from, to];
    if (route) {
      L.polyline(pts, { color: '#fff', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(g);
      L.polyline(pts, { color: '#FF6B00', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(g);
    } else {
      L.polyline(pts, { color: '#FF6B00', weight: 4, opacity: 0.6, dashArray: '8 10' }).addTo(g);
    }
    const startNorth = from[0] >= to[0];
    const sub = route ? `${Math.round(route.km)} km · ${fmtDur(route.sec)}` : [selected.distance, selected.duration].filter(Boolean).join(' · ') || undefined;
    const dot = (bg: string, radius: string) => L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: `<div style="width:18px;height:18px;background:${bg};border:3px solid #fff;border-radius:${radius};box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>` });
    L.marker(from, { icon: dot('#FF6B00', '50%'), interactive: false }).addTo(g);
    L.marker(to, { icon: dot('#0F1115', '5px'), interactive: false }).addTo(g);
    L.marker(from, { interactive: false, zIndexOffset: 500, icon: L.divIcon({ className: '', iconSize: [0, 0], html: chipHtml(selected.departure_time, cityLabel(selected.from_location, lang), undefined, startNorth, '#FF6B00') }) }).addTo(g);
    L.marker(to, { interactive: false, zIndexOffset: 500, icon: L.divIcon({ className: '', iconSize: [0, 0], html: chipHtml(selected.arrival_time || (route ? fmtDur(route.sec) : '—'), cityLabel(selected.to_location, lang), sub, !startNorth, '#0F1115') }) }).addTo(g);
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.arrival_time, selected?.departure_time, route, lang]);

  // refit once the sheet has finished resizing
  useEffect(() => { const id = window.setTimeout(fit, 360); return () => clearTimeout(id); }, [snap, showFilters, fit]);

  const onHeadDown = (e: React.PointerEvent) => { dragY.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onHeadUp = (e: React.PointerEvent) => {
    if (dragY.current == null) return;
    const dy = e.clientY - dragY.current; dragY.current = null;
    const order: Snap[] = ['peek', 'half', 'full'];
    const i = order.indexOf(snap);
    if (dy < -40) setSnap(order[Math.min(2, i + 1)]);
    else if (dy > 40) setSnap(order[Math.max(0, i - 1)]);
    else setSnap(snap === 'half' ? 'full' : 'half');
  };

  const title = `${searchFilters.from ? cityLabel(searchFilters.from, lang) : t('search.all_cities')}`;
  const title2 = `${searchFilters.to ? cityLabel(searchFilters.to, lang) : t('search.all_cities')}`;
  const inputCls = 'bg-[#0F1115] border border-white/10 text-white rounded-xl h-10 px-3 text-sm outline-none focus:border-[#FF6B00]/50';

  return (
    <div className={`fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] ${isAuth ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]' : 'bottom-0'} md:bottom-0 z-0 isolate overflow-hidden bg-[#e8e8e8]`}>
      <div ref={mapEl} dir="ltr" className="absolute inset-0 z-0 isolate" />

      <button
        onClick={() => navigate('/')}
        aria-label="Back"
        className="absolute top-3 start-3 z-[5] w-11 h-11 rounded-full bg-[#1B1F27] border border-white/10 shadow-lg flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-white rtl:rotate-180" />
      </button>

      <div
        ref={sheetRef}
        style={{ height: SNAP_H[snap] }}
        className="absolute z-[5] bottom-0 inset-x-0 md:inset-x-auto md:start-6 md:bottom-6 md:w-[420px] flex flex-col bg-[#0F1115] rounded-t-3xl md:rounded-3xl border border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,.45)] transition-[height] duration-300 ease-out"
      >
        {/* header: swipe / tap to resize */}
        <div onPointerDown={onHeadDown} onPointerUp={onHeadUp} onPointerCancel={() => { dragY.current = null; }} style={{ touchAction: 'none' }} className="shrink-0 cursor-grab select-none px-4 pt-2.5">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-white/20 mb-3" />
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0" dir={dir}>
              <h1 className="text-base font-bold text-white truncate">{title} <span className="text-[#A0A0A0] font-normal">{t('search.to')}</span> {title2}</h1>
              <p className="text-xs text-[#A0A0A0]">{sorted.length} {t('search.rides_available')}</p>
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => { setShowFilters((v) => !v); setSnap('full'); }}
              aria-label={t('search.edit')}
              className={`shrink-0 h-10 px-3 rounded-xl flex items-center gap-1.5 text-sm border ${showFilters ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : 'bg-[#1B1F27] border-white/10 text-white'}`}
            >
              <SlidersHorizontal className="w-4 h-4" /><span>{t('search.edit')}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-2.5" style={{ overscrollBehavior: 'contain' }}>
          {showFilters && (
            <div className="bg-[#1B1F27] rounded-2xl border border-white/5 p-3 mb-1">
              <div className="grid grid-cols-2 gap-2.5">
                <CityPicker value={searchFilters.from} onChange={(v) => setSearchFilters({ ...searchFilters, from: v })} placeholder={t('search.from_label')} className={inputCls} />
                <CityPicker value={searchFilters.to} onChange={(v) => setSearchFilters({ ...searchFilters, to: v })} exclude={searchFilters.from} placeholder={t('search.to_label')} className={inputCls} />
                <input type="date" value={searchFilters.date} onChange={(e) => setSearchFilters({ ...searchFilters, date: e.target.value })} min={new Date().toISOString().split('T')[0]} className={inputCls} />
                <select value={String(searchFilters.passengers)} onChange={(e) => setSearchFilters({ ...searchFilters, passengers: Number(e.target.value) })} className={`${inputCls} appearance-none`}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {t('search.pax')}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 mt-3 text-sm text-[#A0A0A0] cursor-pointer" dir={dir}>
                <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="accent-[#FF6B00]" />
                {t('search.women_only')}
              </label>
              <div className="flex items-center justify-between mt-3" dir={dir}>
                <span className="text-sm text-[#A0A0A0]">{t('search.sort')}</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#0F1115] border border-white/10 text-white rounded-xl h-9 px-3 text-sm outline-none appearance-none">
                  <option value="price">{t('search.lowest_price')}</option>
                  <option value="time">{t('search.earliest')}</option>
                  <option value="rating">{t('search.highest_rated')}</option>
                </select>
              </div>
            </div>
          )}

          {!hasFilters ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4"><MapPin className="w-8 h-8 text-[#FF6B00]" /></div>
              <h3 className="text-base font-medium text-white mb-1" dir={dir}>{t('search.pick_route')}</h3>
              <p className="text-sm text-[#A0A0A0]" dir={dir}>{t('search.pick_route_desc')}</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-[#FF6B00] animate-spin" /></div>
          ) : sorted.length > 0 ? (
            sorted.map((trip) => (
              <OfferRow
                key={trip.id}
                trip={trip}
                selected={selected?.id === trip.id}
                onSelect={() => { if (selected?.id === trip.id) navigate(`/trip/${trip.id}`); else setSelectedId(trip.id); }}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-3"><MapPin className="w-7 h-7 text-[#FF6B00]" /></div>
              <h3 className="text-base font-medium text-white mb-1" dir={dir}>{t('search.no_rides')}</h3>
              <p className="text-sm text-[#A0A0A0] mb-4" dir={dir}>{t('search.try_adjust')}</p>
              <Button onClick={() => setSearchFilters({ from: '', to: '', date: '', passengers: 1 })} variant="outline" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 rounded-xl">{t('search.clear_filters')}</Button>
              {searchFilters.from && searchFilters.to && <TripAlertForm from={searchFilters.from} to={searchFilters.to} />}
            </div>
          )}
        </div>

        {selected && (
        <div className="shrink-0 px-4 pt-2 pb-3 border-t border-white/5 bg-[#0F1115] rounded-b-3xl">
          <Button
            onClick={() => navigate(`/trip/${selected.id}`)}
            className="w-full h-12 rounded-xl bg-[#FF6B00] hover:bg-[#E56000] text-white font-semibold text-base disabled:opacity-40"
          >
            {t('trip.book')} · {selected.price} {t('trip.price')}
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}
