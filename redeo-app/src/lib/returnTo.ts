const KEY = 'redeo-return-to';

/** Remember where the visitor wanted to go before being sent to login/register. */
export function setReturnTo(path: string) {
  try { sessionStorage.setItem(KEY, path); } catch { /* storage unavailable */ }
}

/** Read and clear the saved destination (only same-site paths are accepted). */
export function takeReturnTo(): string | null {
  try {
    const p = sessionStorage.getItem(KEY);
    if (p) sessionStorage.removeItem(KEY);
    return p && p.startsWith('/') && !p.startsWith('//') ? p : null;
  } catch { return null; }
}

export function peekReturnTo(): string | null {
  try {
    const p = sessionStorage.getItem(KEY);
    return p && p.startsWith('/') && !p.startsWith('//') ? p : null;
  } catch { return null; }
}
