import type { SVGProps } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Redeo car icon — sleek sedan, same stroke style as the lucide icon set. */
function CarImpl({ className = 'w-5 h-5', strokeWidth = 1.5, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M4.2 16.8h-.6c-.2 0-.4-.2-.4-.4v-1.8c0-1 .6-1.7 1.5-1.9l2.7-.6 2-3.3c.4-.7 1.1-1.1 1.9-1.1h3c.8 0 1.5.3 2 .9l2.3 3 1.3.3c.9.2 1.6 1 1.6 1.9v2.1c0 .5-.4.9-.9.9h-.8M9.7 16.8h5.1" />
      <path d="M7.6 12.1h9.7M12.2 7.9v4.2" strokeWidth={Math.max(1, strokeWidth - 0.2)} />
      <circle cx="7.2" cy="16.8" r="2" />
      <circle cx="17.3" cy="16.8" r="2" />
    </svg>
  );
}

export const Car = CarImpl as unknown as LucideIcon;
