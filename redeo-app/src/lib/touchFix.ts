// iOS home-screen (standalone) apps sometimes fail to open the keyboard on a plain tap.
// Focusing explicitly inside the touch gesture is allowed by iOS and fixes it.
// Add ?debug=1 to the URL to show a small diagnostic bar (touch target, focus, errors).

const isField = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

export function installTouchFix() {
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.target as Element | null;
    const field = t?.closest?.('input, textarea') ?? null;
    if (isField(field) && !field.disabled && !field.readOnly && document.activeElement !== field) {
      try { field.focus({ preventScroll: false }); } catch { /* ignore */ }
    }
  };
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });

  // iOS standalone sometimes lays the page out against a stale viewport at launch (content jumps
  // ~status-bar-height after the first drag) and touches on fields land in the wrong place.
  // Nudge the viewport so WebKit recomputes layout and hit-testing.
  const nudge = () => {
    try {
      window.dispatchEvent(new Event('resize'));
      const y = window.scrollY;
      if (y === 0) {
        window.scrollTo(0, 1);
        requestAnimationFrame(() => window.scrollTo(0, 0));
      }
    } catch { /* ignore */ }
  };
  [50, 300, 900, 2200].forEach((ms) => setTimeout(nudge, ms));
  window.addEventListener('pageshow', nudge);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) nudge(); });
  window.addEventListener('orientationchange', () => setTimeout(nudge, 200));

  let debug = false;
  try { debug = /[?&]debug=1/.test(location.search) || localStorage.getItem('wa_debug') === '1'; } catch { /* ignore */ }
  if (!debug) return;
  try { localStorage.setItem('wa_debug', '1'); } catch { /* ignore */ }

  const bar = document.createElement('div');
  bar.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.85);color:#7CFC00;font:11px/1.35 monospace;padding:6px 8px;white-space:pre-wrap;direction:ltr;text-align:left';
  document.body.appendChild(bar);
  const info: Record<string, string> = {
    standalone: String((navigator as any).standalone),
    ua: navigator.userAgent.replace(/.*OS ([\d_]+).*/, 'iOS $1'),
    vv: `${window.innerWidth}x${window.innerHeight}`,
  };
  const render = () => { bar.textContent = Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n'); };
  const describe = (el: Element | null) =>
    el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String((el as HTMLElement).className || '').toString().slice(0, 40)}` : 'none';
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    info.touch = `${Math.round(t.clientX)},${Math.round(t.clientY)}`;
    info.target = describe(e.target as Element);
    info.top = describe(document.elementFromPoint(t.clientX, t.clientY));
    render();
  }, { capture: true, passive: true });
  document.addEventListener('focusin', () => { info.focus = describe(document.activeElement); render(); }, true);
  window.addEventListener('error', (e) => { info.error = String(e.message).slice(0, 120); render(); });
  window.addEventListener('unhandledrejection', (e) => { info.reject = String((e as any).reason?.message || (e as any).reason).slice(0, 120); render(); });
  render();
}
