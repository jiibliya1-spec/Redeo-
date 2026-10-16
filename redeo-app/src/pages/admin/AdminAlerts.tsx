import { useEffect, useState, useCallback } from 'react';
import { Loader2, MessageCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Alert {
  id: string; phone: string; from_location: string; to_location: string; created_at: string;
  matched_trip_id: string | null; matched_at: string | null; wa_sent_at: string | null;
  trip?: { departure_date: string; departure_time: string; available_seats: number; price: number } | null;
}

/** Waiting alerts + ready-to-send WhatsApp messages (semi-automatic until a WhatsApp Business API is connected). */
export function AdminAlerts() {
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('trip_alerts').select('*').eq('active', true).order('created_at', { ascending: false }).limit(200);
    const list = (data || []) as Alert[];
    const ids = [...new Set(list.map((a) => a.matched_trip_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: trips } = await supabase.from('trips').select('id,departure_date,departure_time,available_seats,price').in('id', ids);
      const map = new Map((trips || []).map((x: any) => [x.id, x]));
      list.forEach((a) => { a.trip = a.matched_trip_id ? (map.get(a.matched_trip_id) as any) : null; });
    }
    setRows(list);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (a: Alert) => {
    if (!a.trip) return;
    const msg = `مرحبا 👋 رحلة جديدة على ريديو من ${a.from_location} إلى ${a.to_location}\n📅 ${a.trip.departure_date} ⏰ ${a.trip.departure_time}\n💺 ${a.trip.available_seats} مقاعد · 💰 ${a.trip.price} درهم للمقعد\nhttps://redeoapp.com/trip/${a.matched_trip_id}`;
    window.open(`https://wa.me/${a.phone.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    const { error } = await supabase.from('trip_alerts').update({ wa_sent_at: new Date().toISOString() }).eq('id', a.id);
    if (error) toast.error('Could not mark as sent'); else load();
  };

  const pending = rows.filter((a) => a.matched_trip_id && !a.wa_sent_at);
  const waiting = rows.filter((a) => !a.matched_trip_id);

  const Row = ({ a, ready }: { a: Alert; ready: boolean }) => (
    <div className="flex items-center gap-3 bg-[#111318] border border-white/5 rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{a.from_location} → {a.to_location}</p>
        <p className="text-xs text-[#A0A0A0]" dir="ltr">{a.phone}</p>
        {ready && a.trip && <p className="text-xs text-[#FF6B00]">{a.trip.departure_date} {a.trip.departure_time} · {a.trip.available_seats} seats · {a.trip.price} MAD</p>}
      </div>
      {ready && (
        <button onClick={() => send(a)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </button>
      )}
    </div>
  );

  return (
    <AdminLayout>
      {loading ? <Loader2 className="w-6 h-6 text-[#FF6B00] animate-spin" /> : (
        <div className="space-y-6 max-w-2xl">
          <section>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Bell className="w-4 h-4 text-[#FF6B00]" /> Ready to send ({pending.length})</h3>
            <div className="space-y-2">{pending.length ? pending.map((a) => <Row key={a.id} a={a} ready />) : <p className="text-xs text-[#A0A0A0]">—</p>}</div>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-white mb-2">Waiting for a ride ({waiting.length})</h3>
            <div className="space-y-2">{waiting.length ? waiting.map((a) => <Row key={a.id} a={a} ready={false} />) : <p className="text-xs text-[#A0A0A0]">—</p>}</div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
