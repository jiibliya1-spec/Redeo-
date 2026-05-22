
  export interface FrameAnalysis {
    blurScore: number;        // 0-100 (100 = sharp)
    brightnessScore: number;  // 0-100 (50-80 = ideal)
    contrastScore: number;    // 0-100
    fraudScore: number;       // 0-100 (0 = clean, 100 = suspicious)
    overallScore: number;     // 0-100
    ready: boolean;
  }

  export interface GuidanceInfo {
    message: string;
    subMessage: string;
    color: 'green' | 'yellow' | 'red';
    emoji: string;
  }

  /** Laplacian variance — measures sharpness/blur */
  function laplacianVariance(data: Uint8ClampedArray, w: number, h: number): number {
    let sum = 0, count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const top    = 0.299 * data[((y-1)*w+x)*4] + 0.587 * data[((y-1)*w+x)*4+1] + 0.114 * data[((y-1)*w+x)*4+2];
        const bot    = 0.299 * data[((y+1)*w+x)*4] + 0.587 * data[((y+1)*w+x)*4+1] + 0.114 * data[((y+1)*w+x)*4+2];
        const left   = 0.299 * data[(y*w+x-1)*4]   + 0.587 * data[(y*w+x-1)*4+1]   + 0.114 * data[(y*w+x-1)*4+2];
        const right  = 0.299 * data[(y*w+x+1)*4]   + 0.587 * data[(y*w+x+1)*4+1]   + 0.114 * data[(y*w+x+1)*4+2];
        const lap = gray * 4 - top - bot - left - right;
        sum += lap * lap;
        count++;
      }
    }
    const variance = count > 0 ? sum / count : 0;
    // Normalize to 0-100: variance > 1000 = sharp, < 50 = blurry
    return Math.min(100, Math.max(0, (Math.sqrt(variance) / 25) * 100));
  }

  /** Average luminance */
  function averageLuminance(data: Uint8ClampedArray): number {
    let sum = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    }
    return pixels > 0 ? sum / pixels : 128;
  }

  /** Standard deviation of luminance (contrast) */
  function luminanceStdDev(data: Uint8ClampedArray, mean: number): number {
    let sum = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      sum += (lum - mean) ** 2;
    }
    return pixels > 0 ? Math.sqrt(sum / pixels) : 0;
  }

  /** Detect if image is mostly one color (screenshot of screen / printed paper) */
  function detectScreenOrPrint(data: Uint8ClampedArray): number {
    const pixelCount = data.length / 4;
    let suspiciousPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // Very pure colors or near-white/near-black + no grain → suspicious
      const isVeryPure = (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15);
      if (isVeryPure) suspiciousPixels++;
    }
    const ratio = suspiciousPixels / pixelCount;
    // If > 60% pixels are pure white/black → suspicious (could be printed paper photo)
    return Math.min(100, ratio * 150);
  }

  export function analyzeCanvasFrame(imageData: ImageData): FrameAnalysis {
    const { data, width, height } = imageData;

    // Sample center region (where the document should be)
    const margin = Math.floor(Math.min(width, height) * 0.15);
    const centerW = width - margin * 2;
    const centerH = height - margin * 2;

    // Create center crop data
    const centerData = new Uint8ClampedArray(centerW * centerH * 4);
    for (let y = 0; y < centerH; y++) {
      for (let x = 0; x < centerW; x++) {
        const src = ((y + margin) * width + (x + margin)) * 4;
        const dst = (y * centerW + x) * 4;
        centerData[dst]   = data[src];
        centerData[dst+1] = data[src+1];
        centerData[dst+2] = data[src+2];
        centerData[dst+3] = data[src+3];
      }
    }

    const blurRaw = laplacianVariance(centerData, centerW, centerH);
    const blurScore = Math.min(100, blurRaw);

    const lum = averageLuminance(centerData);
    // Ideal luminance: 80-180 out of 255
    const brightnessScore = lum < 40
      ? (lum / 40) * 30             // too dark
      : lum > 220
      ? 30 + (255 - lum) / 35 * 70 // too bright
      : 30 + Math.min(70, ((lum - 40) / 140) * 70 + (180 - lum > 0 ? (180 - lum) / 140 * 70 : 0));

    const stdDev = luminanceStdDev(centerData, lum);
    const contrastScore = Math.min(100, (stdDev / 60) * 100);

    const suspicion = detectScreenOrPrint(data);
    const fraudScore = suspicion;

    const overallScore = Math.round(
      blurScore * 0.4 +
      Math.min(100, brightnessScore) * 0.3 +
      contrastScore * 0.2 +
      (100 - fraudScore) * 0.1
    );

    const ready = blurScore > 45 && lum > 50 && lum < 210 && overallScore > 50;

    return {
      blurScore: Math.round(blurScore),
      brightnessScore: Math.round(Math.min(100, brightnessScore)),
      contrastScore: Math.round(contrastScore),
      fraudScore: Math.round(fraudScore),
      overallScore,
      ready,
    };
  }

  export function analyzeImageData(data: Uint8ClampedArray, width: number, height: number): FrameAnalysis {
    return analyzeCanvasFrame({ data, width, height, colorSpace: 'srgb' } as ImageData);
  }

  export async function analyzeFile(file: File): Promise<FrameAnalysis> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(analyzeCanvasFrame(imageData));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ blurScore: 50, brightnessScore: 50, contrastScore: 50, fraudScore: 20, overallScore: 50, ready: false });
      };
      img.src = url;
    });
  }

  export function getGuidanceInfo(a: FrameAnalysis, lang: string): GuidanceInfo {
    const ar = lang === 'ar', fr = lang === 'fr';

    if (a.blurScore < 30) return {
      message: ar ? 'الصورة ضبابية — لا تحرك الكاميرا' : fr ? 'Image floue — restez immobile' : 'Image blurry — hold still',
      subMessage: ar ? 'ثبّت يدك' : fr ? 'Stabilisez votre main' : 'Stabilize your hand',
      color: 'red', emoji: '🤚',
    };
    if (a.blurScore < 55) return {
      message: ar ? 'قرّب الكاميرا قليلاً' : fr ? 'Rapprochez légèrement' : 'Move slightly closer',
      subMessage: ar ? 'الصورة غير واضحة بما يكفي' : fr ? "L'image n'est pas assez nette" : 'Not sharp enough yet',
      color: 'yellow', emoji: '🔍',
    };
    if (a.brightnessScore < 30) return {
      message: ar ? 'الإضاءة ضعيفة — اذهب لمكان أكثر ضوءاً' : fr ? 'Éclairage insuffisant' : 'Too dark — find better lighting',
      subMessage: ar ? 'افتح النافذة أو أضف ضوء' : fr ? "Allez vers une fenêtre" : 'Move near a window',
      color: 'red', emoji: '💡',
    };
    if (a.brightnessScore < 55) return {
      message: ar ? 'الإضاءة يمكن أن تكون أفضل' : fr ? 'Améliorer l’éclairage' : 'Improve lighting slightly',
      subMessage: ar ? 'تجنب الظلال على الوثيقة' : fr ? 'Évitez les ombres' : 'Avoid shadows on document',
      color: 'yellow', emoji: '🌤',
    };
    if (a.brightnessScore < 30) return {
      message: ar ? 'الإضاءة قوية جداً' : fr ? 'Trop lumineux' : 'Too bright — avoid glare',
      subMessage: ar ? 'تجنب الضوء المباشر' : fr ? 'Évitez le reflet' : 'Avoid direct light',
      color: 'yellow', emoji: '🌟',
    };
    if (a.fraudScore > 60) return {
      message: ar ? 'يبدو أن الوثيقة مصورة من شاشة' : fr ? 'Document semble être une copie d’écran' : 'Looks like a screen copy — use original',
      subMessage: ar ? 'استخدم الوثيقة الأصلية' : fr ? 'Utilisez le document original' : 'Use original document',
      color: 'red', emoji: '⚠️',
    };
    if (a.ready) return {
      message: ar ? 'ممتاز! الوثيقة واضحة ✓' : fr ? 'Excellent! Document net ✓' : 'Perfect! Document clear ✓',
      subMessage: ar ? 'جاري التصوير التلقائي...' : fr ? 'Capture automatique...' : 'Auto-capturing...',
      color: 'green', emoji: '✅',
    };
    return {
      message: ar ? 'ضع الوثيقة داخل الإطار' : fr ? 'Placez le document dans le cadre' : 'Place document in the frame',
      subMessage: ar ? 'اقترب وتأكد من الإضاءة الجيدة' : fr ? 'Approchez-vous et assurez un bon éclairage' : 'Get closer and ensure good lighting',
      color: 'yellow', emoji: '📄',
    };
  }

  export function getQualityLabel(score: number, lang: string): { label: string; color: string } {
    const ar = lang === 'ar', fr = lang === 'fr';
    if (score >= 80) return { label: ar ? 'ممتاز' : fr ? 'Excellent' : 'Excellent', color: '#22c55e' };
    if (score >= 60) return { label: ar ? 'جيد' : fr ? 'Bon' : 'Good', color: '#FF6B00' };
    if (score >= 40) return { label: ar ? 'مقبول' : fr ? 'Acceptable' : 'Fair', color: '#f59e0b' };
    return { label: ar ? 'ضعيف' : fr ? 'Faible' : 'Poor', color: '#ef4444' };
  }

  export function computeAutoVerifyScore(analyses: FrameAnalysis[]): {
    score: number; autoVerified: boolean; reason: string;
  } {
    if (!analyses.length) return { score: 0, autoVerified: false, reason: 'No analyses' };
    const avg = analyses.reduce((s, a) => s + a.overallScore, 0) / analyses.length;
    const avgFraud = analyses.reduce((s, a) => s + a.fraudScore, 0) / analyses.length;
    const autoVerified = avg >= 75 && avgFraud < 20;
    return {
      score: Math.round(avg),
      autoVerified,
      reason: autoVerified
        ? 'All documents passed quality checks'
        : avg < 75 ? 'Document quality below threshold' : 'Fraud indicators detected',
    };
  }
  