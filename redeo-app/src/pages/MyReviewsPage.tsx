import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/lib/i18n';
import { resolveAvatar } from '@/lib/utils';
import { RatingBadge } from '@/components/Rating';

interface Rev { id: string; reviewer_id: string; reviewee_id: string; rating: number; comment: string | null; created_at: string }
interface Who { id: string; name: string; avatar: string | null }

export function MyReviewsPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const [recv, setRecv] = useState<Rev[]>([]);
  const [given, setGiven] = useState<Rev[]>([]);
  const [people, setPeople] = useState<Record<string, Who>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('reviews').select('id,reviewer_id,reviewee_id,rating,comment,created_at').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('reviews').select('id,reviewer_id,reviewee_id,rating,comment,created_at').eq('reviewer_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      const r = (a.data as Rev[]) || [];
      const g = (b.data as Rev[]) || [];
      setRecv(r); setGiven(g);
      const ids = Array.from(new Set([...r.map((x) => x.reviewer_id), ...g.map((x) => x.reviewee_id)]));
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id,name,avatar').in('id', ids);
        setPeople(Object.fromEntries(((data as Who[]) || []).map((p) => [p.id, p])));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const list = tab === 'received' ? recv : given;
  const avg = recv.length ? recv.reduce((s, x) => s + x.rating, 0) / recv.length : 0;

  return (
    <div className="min-h-screen bg-[#0F1115] pt-20 pb-28" dir={dir}>
      <div className="max-w-xl mx-auto px-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5"><ArrowLeft className="w-5 h-5 text-[#A0A0A0] rtl:rotate-180" /></button>
          <h1 className="text-xl font-bold text-white flex-1">{t('reviews.title')}</h1>
          {recv.length > 0 && <RatingBadge rating={avg} count={recv.length} showCount textClass="text-sm text-white" iconClass="w-4 h-4" />}
        </div>

        <div className="flex gap-1 p-1 bg-[#1B1F27] rounded-xl border border-white/5">
          {(['received', 'given'] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === k ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#A0A0A0]'}`}>
              {t(`reviews.${k}`)} ({k === 'received' ? recv.length : given.length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" /></div>
        ) : list.length === 0 ? (
          <p className="text-sm text-[#A0A0A0] text-center py-10">{t(tab === 'received' ? 'reviews.empty_received' : 'reviews.empty_given')}</p>
        ) : list.map((r) => {
          const otherId = tab === 'received' ? r.reviewer_id : r.reviewee_id;
          const p = people[otherId];
          const name = p?.name || '—';
          return (
            <div key={r.id} className="bg-[#1B1F27] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-3">
                <img src={resolveAvatar(p?.avatar, otherId)} alt="" className="w-10 h-10 rounded-full object-cover bg-white/5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t(tab === 'received' ? 'reviews.from' : 'reviews.to', { name })}</p>
                  <p className="text-[11px] text-[#A0A0A0]">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-0.5" dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-white/20'}`} />)}
                </div>
              </div>
              {r.comment && <p className="text-sm text-white/90 mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{r.comment}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
