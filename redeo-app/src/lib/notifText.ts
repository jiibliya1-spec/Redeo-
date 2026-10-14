import { getTranslation, type Lang } from '@/lib/i18n';
import { cityLabel } from '@/lib/cities';

/** Language-neutral texts: the sender stores a key (+ params), every reader sees their own language. */
const PREFIX = 'i18n:';
const TRIP_RX = /\|\|TRIP:[^|]+\|\|\s*$/;

export function encodeText(key: string, params?: Record<string, string | number>): string {
  return PREFIX + key + (params ? '|' + JSON.stringify(params) : '');
}

function interpolate(text: string, params?: Record<string, any>): string {
  return params ? text.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m)) : text;
}

/** Returns the localized text for an encoded string, or null when the string is plain text. */
export function decodeText(raw: string | null | undefined, lang: Lang): string | null {
  if (!raw || !raw.startsWith(PREFIX)) return null;
  const body = raw.slice(PREFIX.length).replace(TRIP_RX, '');
  const bar = body.indexOf('|');
  const key = bar === -1 ? body : body.slice(0, bar);
  let params: Record<string, any> | undefined;
  if (bar !== -1) { try { params = JSON.parse(body.slice(bar + 1)); } catch { params = undefined; } }
  if (params) { params = { ...params }; if (params.from) params.from = cityLabel(params.from, lang); if (params.to) params.to = cityLabel(params.to, lang); }
  return interpolate(getTranslation(lang, key), params);
}

const LEGACY_KEYS = ['booking_request', 'booking_confirmed', 'booking_declined'];
const escRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Old rows were stored as plain English: recognise the known templates and re-render them in the reader's language. */
function legacyEnglish(n: { title?: string; message?: string }, lang: Lang): { title: string; message: string } | null {
  if (lang === 'en') return null;
  const msg = (n.message || '').replace(TRIP_RX, '').trim();
  for (const k of LEGACY_KEYS) {
    const enMsg = getTranslation('en', `notif.${k}_msg`);
    const names: string[] = [];
    const src = escRx(enMsg).replace(/\\\{(\w+)\\\}/g, (_m, name) => { names.push(name); return '(.+?)'; });
    const m = new RegExp('^' + src + '$').exec(msg);
    if (m) {
      const params: Record<string, any> = {};
      names.forEach((nm, i) => { params[nm] = m[i + 1]; });
      if (params.from) params.from = cityLabel(params.from, lang);
      if (params.to) params.to = cityLabel(params.to, lang);
      return { title: getTranslation(lang, `notif.${k}_title`), message: interpolate(getTranslation(lang, `notif.${k}_msg`), params) };
    }
  }
  return null;
}

/** Title + message of a notification in the reader's language (old English rows still work). */
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
/** Removes emoji from old stored texts so the app only shows icons. */
export function stripEmoji(s: string): string { return s.replace(EMOJI_RE, '').replace(/ {2,}/g, ' ').trim(); }

export function localizeNotification(n: { type?: string; title?: string; message?: string; data?: any }, lang: Lang) {
  let title = decodeText(n.title, lang);
  let message = decodeText(n.message, lang);
  if (n.type === 'verification_approved') {
    title = title ?? getTranslation(lang, 'notif.verif_approved_title');
    message = message ?? getTranslation(lang, 'notif.verif_approved_msg');
  } else if (n.type === 'verification_rejected') {
    let reason = '';
    try { reason = (typeof n.data === 'string' ? JSON.parse(n.data) : n.data)?.reason || ''; } catch { /* ignore */ }
    if (!reason) { const m = /Reason:\s*(.*?)\.\s*Please/i.exec(n.message || ''); reason = m?.[1] || ''; }
    title = title ?? getTranslation(lang, 'notif.verif_rejected_title');
    message = message ?? interpolate(getTranslation(lang, reason ? 'notif.verif_rejected_msg' : 'notif.verif_rejected_msg_noreason'), { reason });
  }
  if (title === null && message === null) {
    const old = legacyEnglish(n, lang);
    if (old) return { title: stripEmoji(old.title), message: stripEmoji(old.message) };
  }
  return {
    title: stripEmoji(title ?? n.title ?? ''),
    message: stripEmoji((message ?? n.message ?? '').replace(/\|\|TRIP:[^|]+\|\|/, '').trim()),
  };
}

/** Where a notification should take the user when tapped (null = nowhere special). */
export function notificationDest(
  n: { type?: string; message?: string; link?: string | null },
  ctx: { isDriver: boolean },
): string | null {
  if (n.link && n.link.startsWith('/')) return n.link;
  const tripId = /\|\|TRIP:([^|]+)\|\|/.exec(n.message || '')?.[1];
  if (tripId) return ctx.isDriver ? '/driver' : '/my-trips';
  if (n.type === 'message') return '/messages';
  if (n.type === 'support') return '/support';
  if (n.type === 'verification_approved' || n.type === 'verification_rejected') return '/verification';
  return null;
}
