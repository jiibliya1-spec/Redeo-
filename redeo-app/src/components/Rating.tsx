import { Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** A rating only exists once someone has really reviewed the user. */
export function hasRating(rating?: number | null, count?: number | null): rating is number {
  if (rating === null || rating === undefined) return false;
  if (!(Number(rating) > 0)) return false;
  // rating_count is not always present on older rows; if it is present and 0, there is no rating
  return count === undefined || count === null || Number(count) > 0;
}

/** Star + number when rated; an empty, uncoloured star when the user has no reviews yet. */
export function RatingBadge({
  rating, count, className = '', iconClass = 'w-3.5 h-3.5', textClass = 'text-xs text-[#A0A0A0]', showCount = false,
}: {
  rating?: number | null; count?: number | null; className?: string; iconClass?: string; textClass?: string; showCount?: boolean;
}) {
  const { t } = useI18n();
  const rated = hasRating(rating, count);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={rated ? undefined : t('rating.none')}>
      {rated ? (
        <>
          <Star className={`${iconClass} text-[#FF6B00] fill-[#FF6B00]`} />
          <span className={textClass}>{Number(rating).toFixed(1)}{showCount && count ? ` (${count})` : ''}</span>
        </>
      ) : (
        <>
          <Star className={`${iconClass} text-[#A0A0A0]/50`} fill="none" />
          <span className={textClass}>{t('rating.none_short')}</span>
        </>
      )}
    </span>
  );
}
