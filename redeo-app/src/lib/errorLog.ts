import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

/** Lightweight error reporting into public.client_errors (insert-only for clients, readable by admins). */
const seen = new Set<string>();
let sent = 0;
const MAX_PER_SESSION = 8;
// Browser/extension noise that says nothing about the app
const IGNORE = /ResizeObserver loop|Script error|Non-Error promise rejection|AbortError|Load failed|Failed to fetch|NetworkError|chrome-extension|webkit-masked-url/i;

export function reportError(err: unknown, extra?: string) {
  try {
    const e = err as any;
    const message = String(e?.message || e || 'unknown').slice(0, 500);
    if (IGNORE.test(message) || sent >= MAX_PER_SESSION) return;
    const key = message + (extra || '');
    if (seen.has(key)) return;
    seen.add(key); sent++;
    const uid = useStore.getState().user?.id || null;
    fetch(`${SUPABASE_URL}/rest/v1/client_errors`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      // anon role: user_id must stay null (RLS), so the user id goes into the url field instead
      body: JSON.stringify({
        message: (extra ? extra + ': ' : '') + message,
        stack: String(e?.stack || '').slice(0, 2000) || null,
        url: (location.pathname + (uid ? ` [u:${uid}]` : '')).slice(0, 300),
        ua: navigator.userAgent.slice(0, 300),
        release: (import.meta as any).env?.VITE_RELEASE || null,
      }),
    }).catch(() => {});
  } catch { /* never throw from the reporter */ }
}

export function installErrorReporting() {
  window.addEventListener('error', (ev) => reportError(ev.error || ev.message, 'window.error'));
  window.addEventListener('unhandledrejection', (ev) => reportError((ev as PromiseRejectionEvent).reason, 'unhandledrejection'));
}
