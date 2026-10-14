import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Gauge, Loader2, MapPinOff, Navigation, Radio } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCity } from '@/lib/cities';
import { cityCoords } from '@/lib/cityCoords';
import { fetchShare, type PublicShare } from '@/lib/tripShare';

const POLL_MS = 5000;

const css = `
.rd-me{position:relative;width:22px;height:22px}
.rd-me i{position:absolute;inset:0;border-radius:50%;background:rgba(255,107,0,.35);animation:rdp 1.8s ease-out infinite}
.rd-me b{position:absolute;inset:4px;border-radius:50%;background:#FF6B00;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.rd-dest{width:26px;height:26px;border-radius:50% 50% 50% 0;background:#111318;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)}
@keyframes rdp{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
.leaflet-container{font-family:inherit;background:#e8e8e8}
.leaflet-top.leaflet-right{margin-top:68px}
`;

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const fmtDur = (sec: number) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };

export function TrackPage() {
  const { token = '' } = useParams();
  const { t, dir } = useI18n();
  const city = useCity();
  const [data, setData] = useState<PublicShare | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [, tick] = useState(0);
  const [route, setRoute] = useState<{ km: number; sec: number } | null>(null);
  const [following, setFollowing] = useState(true);

  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<L.Marker | null>(null);
  const dest = useRef<L.Marker | null>(null);
  const trail = useRef<L.Polyline | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const fitted = useRef(false);
  const lastRoute = useRef<{ at: number; pos: [number, number] } | null>(null);
  const followRef = useRef(true);
  followRef.current = following;

  const destPos = useMemo(() => cityCoords(data?.to), [data?.to]);

  // polling
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const d = await fetchShare(token);
      if (!alive) return;
      if (!d) return; // network hiccup: keep what we have and retry
      setData(d); setLoaded(true); setFetchedAt(Date.now());
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    const clock = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => { alive = false; clearInterval(id); clearInterval(clock); };
  }, [token]);

  // map setup once the page has something to show
  const showMap = data && (data.status === 'live' || data.status === 'waiting');
  useEffect(() => {
    if (!showMap || !mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([31.8, -7.1], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    m.on('dragstart', () => setFollowing(false));
    map.current = m;
    return () => { m.remove(); map.current = null; me.current = dest.current = trail.current = routeLine.current = null; fitted.current = false; };
  }, [showMap]);

  // update markers / trail / destination
  useEffect(() => {
    const m = map.current;
    if (!m || !data) return;
    if (destPos && !dest.current) {
      dest.current = L.marker(destPos, { icon: L.divIcon({ className: '', html: '<div class="rd-dest"></div>', iconSize: [26, 26], iconAnchor: [13, 26] }) }).addTo(m);
    }
    if (data.lat != null && data.lng != null) {
      const pos: [number, number] = [data.lat, data.lng];
      if (!me.current) me.current = L.marker(pos, { icon: L.divIcon({ className: '', html: '<div class="rd-me"><i></i><b></b></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 }).addTo(m);
      else me.current.setLatLng(pos);
      const pts = (data.trail?.length ? data.trail : [pos]) as [number, number][];
      if (!trail.current) trail.current = L.polyline(pts, { color: '#FF6B00', weight: 5, opacity: 0.9 }).addTo(m);
      else trail.current.setLatLngs(pts);
      if (!fitted.current) {
        fitted.current = true;
        m.fitBounds(L.latLngBounds(destPos ? [pos, destPos] : [pos, pos]).pad(0.3), { maxZoom: 15 });
      } else if (followRef.current) {
        m.panTo(pos, { animate: true });
      }
    }
  }, [data, destPos]);

  // remaining route + ETA from the public routing service (refreshed at most once a minute)
  useEffect(() => {
    if (!data || data.lat == null || data.lng == null || !destPos) return;
    const pos: [number, number] = [data.lat, data.lng];
    const last = lastRoute.current;
    if (last && Date.now() - last.at < 60000 && haversineKm(last.pos, pos) < 1.5) return;
    lastRoute.current = { at: Date.now(), pos };
    const ctrl = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${pos[1]},${pos[0]};${destPos[1]},${destPos[0]}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        const r0 = j?.routes?.[0];
        if (!r0) return;
        setRoute({ km: r0.distance / 1000, sec: r0.duration });
        const pts = (r0.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        if (map.current) {
          if (!routeLine.current) routeLine.current = L.polyline(pts, { color: '#3B82F6', weight: 4, opacity: 0.6, dashArray: '8 10' }).addTo(map.current);
          else routeLine.current.setLatLngs(pts);
        }
      })
      .catch(() => { /* routing is optional */ });
    return () => ctrl.abort();
  }, [data?.lat, data?.lng, destPos]);

  const name = data?.name || 'Redeo';
  const ageSec = data?.last_at && data.now
    ? Math.max(0, (Date.parse(data.now) - Date.parse(data.last_at)) / 1000 + (Date.now() - fetchedAt) / 1000) : null;
  const stale = ageSec != null && ageSec > 120;
  const eta = route ? new Date(Date.now() + route.sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const kmh = data?.speed != null && data.speed >= 0 ? Math.round(data.speed * 3.6) : null;

  if (!loaded) {
    return <div className="min-h-screen bg-[#0F1115] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" /></div>;
  }

  if (!showMap) {
    const notFound = data?.status === 'not_found';
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center px-6 text-center" dir={dir}>
        <div className="max-w-sm">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white/5 flex items-center justify-center"><MapPinOff className="w-7 h-7 text-[#A0A0A0]" /></div>
          <h1 className="text-xl font-bold text-white mb-2">{notFound ? t('track.not_found') : t('track.ended_title')}</h1>
          {!notFound && <p className="text-sm text-[#A0A0A0] leading-relaxed">{t('track.ended_msg', { name })}</p>}
          <a href="/" className="inline-block mt-6 text-sm font-medium text-[#FF6B00]">{t('track.shared_via')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0F1115]" dir={dir}>
      <style>{css}</style>
      <div ref={mapEl} className="absolute inset-0" dir="ltr" />

      <div className="absolute top-0 inset-x-0 z-[500] p-3 pointer-events-none">
        <div className="mx-auto max-w-md flex items-center gap-2 bg-[#111318]/90 backdrop-blur rounded-2xl px-4 py-2.5 border border-white/10 pointer-events-auto">
          <span className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white text-sm font-bold">R</span>
          <span className="text-sm font-semibold text-white">Redeo</span>
          <span className={`ms-auto flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${stale || data?.status === 'waiting' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'}`}>
            <Radio className="w-3 h-3" />{t('track.live')}
          </span>
        </div>
      </div>

      {!following && (
        <button onClick={() => { setFollowing(true); if (me.current) map.current?.panTo(me.current.getLatLng()); }}
          className="absolute z-[500] end-3 bottom-[220px] w-11 h-11 rounded-full bg-[#111318] border border-white/10 text-white flex items-center justify-center shadow-lg" aria-label={t('track.recenter')}>
          <Crosshair className="w-5 h-5" />
        </button>
      )}

      <div className="absolute bottom-0 inset-x-0 z-[500] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md bg-[#111318] rounded-3xl border border-white/10 p-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0"><Navigation className="w-5 h-5 text-[#FF6B00]" /></div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white truncate">{data?.status === 'waiting' ? t('track.waiting', { name }) : t('track.on_the_way', { name })}</p>
              <p className="text-xs text-[#A0A0A0] truncate">{city(data?.from)} → {city(data?.to)}</p>
            </div>
          </div>

          {data?.status === 'live' && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-white/5 px-3 py-2"><p className="text-[10px] text-[#A0A0A0]">{t('track.eta')}</p><p className="text-sm font-bold text-white">{eta ?? '—'}</p></div>
              <div className="rounded-xl bg-white/5 px-3 py-2"><p className="text-[10px] text-[#A0A0A0]">{t('track.remaining')}</p><p className="text-sm font-bold text-white">{route ? `${Math.round(route.km)} km` : '—'}{route && <span className="block text-[10px] font-normal text-[#A0A0A0]">{fmtDur(route.sec)}</span>}</p></div>
              <div className="rounded-xl bg-white/5 px-3 py-2"><p className="text-[10px] text-[#A0A0A0] flex items-center gap-1"><Gauge className="w-3 h-3" />{t('track.speed')}</p><p className="text-sm font-bold text-white">{kmh != null ? `${kmh} km/h` : '—'}</p></div>
            </div>
          )}

          <p className={`text-[11px] ${stale ? 'text-yellow-400' : 'text-[#A0A0A0]'}`}>
            {ageSec == null ? '' : stale ? t('track.signal_lost', { m: Math.max(1, Math.round(ageSec / 60)) }) : t('track.updated', { s: Math.round(ageSec) })}
          </p>
        </div>
      </div>
    </div>
  );
}
