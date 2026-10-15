// Sends every request that arrives on the old Cloudflare hostname to the real domain,
// keeping path and query. Other *.pages.dev hosts (branch previews) are left alone.
const OLD_HOST = 'redeo-5he.pages.dev';
const NEW_ORIGIN = 'https://redeoapp.com';

export const onRequest = (context: { request: Request; next: () => Promise<Response> }) => {
  const url = new URL(context.request.url);
  if (url.hostname === OLD_HOST) {
    return Response.redirect(NEW_ORIGIN + url.pathname + url.search, 301);
  }
  return context.next();
};
