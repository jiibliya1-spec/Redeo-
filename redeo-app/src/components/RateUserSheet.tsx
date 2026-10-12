import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: (bookingId: string) => void;
  reviewerId: string;
  revieweeId: string;
  tripId: string;
  bookingId: string;
  name?: string;
}

/** Bottom sheet to rate the other person of a finished trip. The database only accepts
 *  reviews for confirmed, already-departed bookings and one review per booking. */
export function RateUserSheet({ open, onClose, onDone, reviewerId, revieweeId, tripId, bookingId, name }: Props) {
  const { t, dir } = useI18n();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async () => {
    if (!stars || busy) return;
    setBusy(true);
    const { error } = await supabase.from('reviews').insert({
      trip_id: tripId, booking_id: bookingId, reviewer_id: reviewerId, reviewee_id: revieweeId,
      rating: stars, comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      if ((error as any).code === '23505') { toast.info(t('rating.already')); onDone(bookingId); onClose(); return; }
      toast.error(t('rating.failed'));
      return;
    }
    toast.success(t('rating.thanks'));
    onDone(bookingId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose} dir={dir}>
      <div className="w-full sm:max-w-sm bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white text-center">{t('rating.title')}</h3>
        {name && <p className="text-sm text-[#FF6B00] text-center mt-1">{name}</p>}
        <p className="text-xs text-[#A0A0A0] text-center mt-1">{t('rating.subtitle')}</p>
        <div className="flex justify-center gap-2 my-5" dir="ltr">
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} onClick={() => setStars(i)} aria-label={String(i)} className="p-1">
              <Star className={`w-9 h-9 ${i <= stars ? 'text-[#FF6B00] fill-[#FF6B00]' : 'text-[#A0A0A0]/40'}`} />
            </button>
          ))}
        </div>
        <p className="text-xs text-[#A0A0A0] text-center mb-3 h-4">{stars ? t(`rating.${stars}`) : t('rating.tap')}</p>
        <textarea
          value={comment} onChange={e => setComment(e.target.value)} maxLength={300} rows={3}
          placeholder={t('rating.comment_ph')}
          className="w-full bg-[#0F1115] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-[#A0A0A0]/60 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-[#A0A0A0] text-sm font-medium">{t('rating.cancel')}</button>
          <button onClick={submit} disabled={!stars || busy}
            className="flex-1 py-3 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('rating.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
