import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface M {
  trips_total: number; trips_booked_48h: number;
  drivers_total: number; drivers_second_14d: number;
  searches_total: number; searches_with_results: number;
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

/** Three launch metrics for the soft launch (needs supabase_v2_safety_metrics.sql applied). */
export function AdminMetrics() {
  const [m, setM] = useState<M | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    supabase.rpc('admin_metrics').then(({ data, error }) => {
      if (error || !data) setErr(true); else setM(data as M);
    });
  }, []);

  const cards = m ? [
    { label: 'Trips booked within 48h', value: pct(m.trips_booked_48h, m.trips_total), sub: `${m.trips_booked_48h} / ${m.trips_total} trips` },
    { label: 'Drivers publishing a 2nd trip within 14 days', value: pct(m.drivers_second_14d, m.drivers_total), sub: `${m.drivers_second_14d} / ${m.drivers_total} drivers` },
    { label: 'Searches that return a trip', value: pct(m.searches_with_results, m.searches_total), sub: `${m.searches_with_results} / ${m.searches_total} searches` },
  ] : [];

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-white mb-3">Launch metrics</h3>
      {err && <p className="text-xs text-yellow-400">Metrics unavailable — apply supabase_v2_safety_metrics.sql in the Supabase SQL editor.</p>}
      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-[#111318] rounded-2xl border border-white/5 p-5">
            <p className="text-3xl font-bold text-[#FF6B00]">{c.value}</p>
            <p className="text-xs text-white mt-1">{c.label}</p>
            <p className="text-[11px] text-[#A0A0A0] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
