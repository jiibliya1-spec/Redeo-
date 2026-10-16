// Gives every shared trip link a rich preview (WhatsApp / Facebook / Telegram) by injecting
// Open Graph tags into the SPA's index.html. The app itself is served unchanged.
interface Env { ASSETS: { fetch: (r: Request) => Promise<Response> } }

const SUPABASE_URL = 'https://fxedvtmzqjgzvplclhza.supabase.co';
// Public anon key (same one the browser bundle uses; trips are publicly readable by RLS)
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZWR2dG16cWpnenZwbGNsaHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Njg2NTEsImV4cCI6MjEwNzI0NDY1MX0.3cYNT_c-iXEuVfiSVY2v915SB22Tv0lA0sD_0Y293rs';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const onRequest = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new Request(url.origin + '/'));
  const id = String(params.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return page;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/trips?select=from_location,to_location,departure_date,departure_time,price,available_seats,meeting_point,women_only&id=eq.${id}&limit=1`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } },
    );
    const t = ((await r.json()) as any[])?.[0];
    if (!t) return page;

    const title = `${t.from_location} → ${t.to_location} · ${t.price} MAD`;
    const desc = `رحلة مشتركة يوم ${t.departure_date} الساعة ${t.departure_time} · ${t.available_seats} مقاعد متاحة`
      + (t.meeting_point ? ` · نقطة اللقاء: ${t.meeting_point}` : '')
      + (t.women_only ? ' · للنساء فقط' : '');
    const tags = [
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="Redeo">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(desc)}">`,
      `<meta property="og:url" content="${esc(url.origin + url.pathname)}">`,
      `<meta property="og:image" content="${url.origin}/icon-512.png">`,
      `<meta name="twitter:card" content="summary">`,
      `<meta name="description" content="${esc(desc)}">`,
    ].join('\n');

    return new HTMLRewriter()
      .on('title', { element(e: any) { e.setInnerContent(`${title} | Redeo`); } })
      .on('meta[name="description"]', { element(e: any) { e.remove(); } })
      .on('head', { element(e: any) { e.append(tags, { html: true }); } })
      .transform(page);
  } catch {
    return page;
  }
};
