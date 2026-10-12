/** Maps raw (English) backend/auth errors to a translation key; the UI shows its own language. */
export function authErrorKey(message?: string | null): string {
  const m = (message || '').toLowerCase();
  if (!m) return 'err.generic';
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'err.invalid_login';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return 'err.email_taken';
  if (m.includes('email not confirmed')) return 'err.email_unconfirmed';
  if (m.includes('password should') || m.includes('weak password') || m.includes('at least 6')) return 'err.weak_password';
  if (m.includes('rate limit') || m.includes('too many') || /after \d+ seconds?/.test(m)) return 'err.rate_limit';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'err.network';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'err.invalid_email';
  if (m.includes('admin registration')) return 'err.admin_register';
  return 'err.generic';
}
