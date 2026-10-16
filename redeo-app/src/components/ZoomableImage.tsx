import { useRef, useState } from 'react';

/** Image with pinch / wheel / double-tap zoom and drag. The rest of the app is not zoomable (see lib/noZoom). */
export function ZoomableImage({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ dist: number; s: number } | null>(null);
  const lastTap = useRef(0);

  const clamp = (s: number) => Math.min(6, Math.max(1, s));
  const reset = () => setT({ s: 1, x: 0, y: 0 });

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      last.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: t.s };
    } else if (pts.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) setT((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { ...p, s: 2.5 }));
      lastTap.current = now;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && last.current) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = clamp(last.current.s * (d / last.current.dist));
      setT((p) => ({ ...p, s, ...(s === 1 ? { x: 0, y: 0 } : {}) }));
    } else if (pts.current.size === 1 && t.s > 1) {
      setT((p) => ({ ...p, x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) last.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    setT((p) => {
      const s = clamp(p.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      return s === 1 ? { s, x: 0, y: 0 } : { ...p, s };
    });
  };

  return (
    <div data-zoomable className="relative overflow-hidden touch-none select-none"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      <img
        src={src} alt={alt} draggable={false}
        className={className}
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: pts.current.size ? 'none' : 'transform 0.15s', cursor: t.s > 1 ? 'grab' : 'zoom-in' }}
      />
      {t.s > 1 && (
        <button onClick={(e) => { e.stopPropagation(); reset(); }} onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs">100%</button>
      )}
    </div>
  );
}
