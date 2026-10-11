import { useId } from 'react';

/** WansniAuto brand mark: a "W" drawn as a road, with a destination dot. */
export function Logo({ className = 'w-9 h-9', rounded = true }: { className?: string; rounded?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="WansniAuto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`wg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A3D" />
          <stop offset="1" stopColor="#FF5A00" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx={rounded ? 116 : 0} fill={`url(#wg-${id})`} />
      <path d="M104 190 L184 372 L256 244 L328 372 L408 190" fill="none" stroke="#fff" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="256" cy="148" r="30" fill="#fff" />
    </svg>
  );
}
