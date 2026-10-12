import { supabase } from '@/lib/supabase';
import { analyzeCanvasFrame, type FrameAnalysis } from '@/services/kycService';

export type AiVerdict = 'accept' | 'retake' | 'review';

export interface ScanResult {
  verdict: AiVerdict;
  message: string;
  issues: string[];
}

export interface SubmitResult {
  ok: boolean;
  status: number;
  error?: string;
  docs?: string[];
}

const MAX_SIDE = 1600;

/**
 * Decode the photo ONCE, downscale to a JPEG (max 1600px) and compute the quality analysis from the same canvas.
 * The exact bytes returned here are what gets stored and scanned.
 */
export async function compressImage(file: File): Promise<{ file: File; b64: string; mediaType: string; analysis?: FrameAnalysis }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // cannot decode (unusual format): send as-is
    const buf = await file.arrayBuffer();
    return { file, b64: toB64(new Uint8Array(buf)), mediaType: file.type || 'image/jpeg' };
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // quality analysis on a small copy of the already-decoded canvas (no second decode of the big photo)
  let analysis: FrameAnalysis | undefined;
  try {
    const k = Math.min(1, 800 / Math.max(w, h));
    const small = document.createElement('canvas');
    small.width = Math.round(w * k);
    small.height = Math.round(h * k);
    const sctx = small.getContext('2d', { willReadFrequently: true });
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, small.width, small.height);
      analysis = analyzeCanvasFrame(sctx.getImageData(0, 0, small.width, small.height));
    }
  } catch { /* quality score is optional */ }

  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode_failed'))), 'image/jpeg', 0.85));
  const out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  return { file: out, b64: toB64(new Uint8Array(await blob.arrayBuffer())), mediaType: 'image/jpeg', analysis };
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  return jwt ? { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/** Scan one uploaded document. Returns null when the AI service is unavailable (never blocks the user). */
export async function scanDocument(
  docType: string, storagePath: string, b64: string, mediaType: string, lang: string,
): Promise<ScanResult | null> {
  try {
    const res = await fetch('/api/verify-doc', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ doc_type: docType, storage_path: storagePath, image_b64: b64, media_type: mediaType, lang }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.verdict) return null;
    return { verdict: j.verdict, message: j.message || '', issues: Array.isArray(j.issues) ? j.issues : [] };
  } catch {
    return null;
  }
}

/** Server-side submit: builds the admin summary and moves the documents to the admin queue. */
export async function submitVerification(): Promise<SubmitResult> {
  try {
    const res = await fetch('/api/submit-verification', { method: 'POST', headers: await authHeader(), body: '{}' });
    if (res.ok) return { ok: true, status: res.status };
    const j = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, error: j?.error, docs: j?.docs };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  }
}

export const AI_MESSAGES: Record<string, Record<AiVerdict | 'scanning', string>> = {
  ar: {
    scanning: 'جاري الفحص الذكي للوثيقة...',
    accept: 'الوثيقة مقبولة مبدئيا',
    retake: 'الوثيقة غير واضحة أو غير مطابقة. عاود صورها من جديد.',
    review: 'تم استلام الوثيقة، وغادي تدوز لمراجعة يدوية من الإدارة.',
  },
  fr: {
    scanning: 'Analyse intelligente du document...',
    accept: 'Document accepté provisoirement',
    retake: "Le document n'est pas lisible ou ne correspond pas. Veuillez le reprendre.",
    review: "Document reçu, il sera examiné manuellement par l'équipe.",
  },
  en: {
    scanning: 'Smart document check in progress...',
    accept: 'Document provisionally accepted',
    retake: 'The document is unclear or does not match. Please retake it.',
    review: 'Document received; it will go through a manual review by our team.',
  },
};
