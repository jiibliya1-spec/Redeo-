import { useId } from 'react';

/** Redeo brand mark: an "R" whose leg is a road ending at a destination dot. */
export function Logo({ className = 'w-9 h-9', rounded = true }: { className?: string; rounded?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Redeo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`wg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A3D" />
          <stop offset="1" stopColor="#FF5A00" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx={rounded ? 116 : 0} fill={`url(#wg-${id})`} />
      <path d="M164 392 V136 H274 A70 70 0 0 1 274 276 H164 M262 276 L356 392" fill="none" stroke="#fff" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
