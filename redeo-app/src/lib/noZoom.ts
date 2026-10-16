/** Makes the PWA behave like a native app: no pinch / double-tap / Ctrl+wheel page zoom.
 *  Exceptions: images shown in a ZoomableImage ([data-zoomable]) and maps (Leaflet). */
const allowed = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest('[data-zoomable], .leaflet-container');

export function installNoZoom() {
  const opts = { passive: false } as AddEventListenerOptions;
  // iOS Safari ignores user-scalable=no, so pinch gestures are cancelled explicitly
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) =>
    document.addEventListener(n, (e) => { if (!allowed(e.target)) e.preventDefault(); }, opts));
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 && !allowed(e.target)) e.preventDefault();
  }, opts);
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey && !allowed(e.target)) e.preventDefault();
  }, opts);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) e.preventDefault();
  });
}
