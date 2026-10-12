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

/** Title + message of a notification in the reader's language (old English rows still work). */
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
  return {
    title: title ?? n.title ?? '',
    message: (message ?? n.message ?? '').replace(/\|\|TRIP:[^|]+\|\|/, '').trim(),
  };
}
