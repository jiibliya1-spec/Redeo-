
  import { useRef, useState, useEffect, useCallback } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Camera, X, RotateCcw, Check, ZoomIn, Scan } from 'lucide-react';
  import { analyzeCanvasFrame, getGuidanceInfo, type FrameAnalysis } from '@/services/kycService';

  interface Props {
    docId: string;
    docLabel: string;
    docLabelAr: string;
    docLabelFr: string;
    isSelfie?: boolean;
    lang: string;
    onCapture: (file: File, analysis: FrameAnalysis) => void;
    onCancel: () => void;
  }

  export function CameraCapture({ docId, docLabel, docLabelAr, docLabelFr, isSelfie, lang, onCapture, onCancel }: Props) {
    const videoRef    = useRef<HTMLVideoElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const analyzeRef  = useRef<HTMLCanvasElement>(null);
    const streamRef   = useRef<MediaStream | null>(null);
    const rafRef      = useRef<number>(0);
    const readyRef    = useRef(0);
    const capturedRef = useRef(false);

    const [started,     setStarted]     = useState(false);
    const [camError,    setCamError]     = useState<string | null>(null);
    const [analysis,    setAnalysis]     = useState<FrameAnalysis | null>(null);
    const [capturedUrl, setCapturedUrl]  = useState<string | null>(null);
    const [capturedBlob,setCapturedBlob] = useState<Blob | null>(null);
    const [flash,       setFlash]        = useState(false);
    const [countdown,   setCountdown]    = useState<number | null>(null);

    const ar = lang === 'ar', fr = lang === 'fr';
    const getDocName = () => ar ? docLabelAr : fr ? docLabelFr : docLabel;

    const stopCamera = useCallback(() => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
      setCamError(null);
      capturedRef.current = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: isSelfie ? 'user' : { ideal: 'environment' },
            width: { ideal: 1920 }, height: { ideal: 1080 },
          }
        });
        streamRef.current = stream;
        const vid = videoRef.current;
        if (vid) {
          vid.srcObject = stream;
          await vid.play();
          setStarted(true);
        }
      } catch (e: any) {
        const msg = e.name === 'NotAllowedError'
          ? (ar ? 'لم يتم السماح بالوصول للكاميرا. اضغط السماح في المتصفح.'
               : fr ? "Accès caméra refusé. Autorisez l\'accès dans le navigateur."
               : 'Camera access denied. Please allow camera access in your browser.')
          : e.message;
        setCamError(msg);
      }
    }, [isSelfie, ar, fr]);

    const doCapture = useCallback(() => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      const vid = videoRef.current;
      const cvs = canvasRef.current;
      if (!vid || !cvs) return;
      cvs.width  = vid.videoWidth  || 1280;
      cvs.height = vid.videoHeight || 720;
      const ctx = cvs.getContext('2d')!;
      if (isSelfie) { ctx.translate(cvs.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(vid, 0, 0);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      cvs.toBlob(blob => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopCamera();
      }, 'image/jpeg', 0.92);
    }, [isSelfie, stopCamera]);

    const analyzeLoop = useCallback(() => {
      const vid = videoRef.current;
      const cvs = analyzeRef.current;
      if (!vid || !cvs || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(analyzeLoop);
        return;
      }
      const W = Math.floor(vid.videoWidth  / 3) || 320;
      const H = Math.floor(vid.videoHeight / 3) || 240;
      cvs.width = W; cvs.height = H;
      const ctx = cvs.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(vid, 0, 0, W, H);
      const imgData = ctx.getImageData(0, 0, W, H);
      const result  = analyzeCanvasFrame(imgData);
      setAnalysis(result);

      if (result.ready) {
        readyRef.current++;
        // Auto-capture after ~1.5s of ready frames (45 frames @ ~30fps)
        if (readyRef.current === 10) setCountdown(3);
        if (readyRef.current === 20) setCountdown(2);
        if (readyRef.current === 35) setCountdown(1);
        if (readyRef.current >= 50 && !capturedRef.current) {
          setCountdown(null);
          doCapture();
          return;
        }
      } else {
        readyRef.current = 0;
        setCountdown(null);
      }

      rafRef.current = requestAnimationFrame(analyzeLoop);
    }, [doCapture]);

    useEffect(() => { startCamera(); return () => stopCamera(); }, []);
    useEffect(() => {
      if (started) { rafRef.current = requestAnimationFrame(analyzeLoop); }
      return () => cancelAnimationFrame(rafRef.current);
    }, [started, analyzeLoop]);

    const handleRetake = () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(null);
      setCapturedUrl(null);
      readyRef.current = 0;
      setCountdown(null);
      startCamera().then(() => {
        rafRef.current = requestAnimationFrame(analyzeLoop);
      });
    };

    const handleConfirm = () => {
      if (!capturedBlob) return;
      const ext = 'jpg';
      const file = new File([capturedBlob], `${docId}_${Date.now()}.${ext}`, { type: 'image/jpeg' });
      onCapture(file, analysis || { blurScore: 70, brightnessScore: 70, contrastScore: 70, fraudScore: 5, overallScore: 70, ready: true });
    };

    const guidance = analysis ? getGuidanceInfo(analysis, lang) : null;
    const guidanceColor = guidance?.color === 'green' ? '#22c55e' : guidance?.color === 'red' ? '#ef4444' : '#f59e0b';
    const frameColor = guidance?.color === 'green' ? '#22c55e' : guidance?.color === 'red' ? '#ef4444' : '#FF6B00';

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Hidden analysis canvas */}
        <canvas ref={analyzeRef} className="hidden" />
        {/* Capture canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Flash effect */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 z-50 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-black/80">
          <button onClick={onCancel} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-white text-sm font-semibold">{getDocName()}</p>
            <p className="text-white/50 text-xs">
              {ar ? 'نظام التحقق الذكي KYC' : fr ? 'Vérification intelligente KYC' : 'Smart KYC Verification'}
            </p>
          </div>
          <div className="w-9 h-9 flex items-center justify-center">
            <Scan className="w-5 h-5 text-[#FF6B00]" />
          </div>
        </div>

        {/* Camera / Preview area */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">

          {/* Camera error */}
          {camError && !capturedUrl && (
            <div className="text-center px-8 py-10">
              <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white text-sm mb-4">{camError}</p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold"
              >
                {ar ? 'إعادة المحاولة' : fr ? 'Réessayer' : 'Try Again'}
              </button>
              <button
                onClick={onCancel}
                className="block mx-auto mt-3 text-white/50 text-sm underline"
              >
                {ar ? 'رفع من المعرض بدلاً من ذلك' : fr ? 'Télécharger depuis la galerie' : 'Upload from gallery instead'}
              </button>
            </div>
          )}

          {/* Live camera feed */}
          {!capturedUrl && !camError && (
            <>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: isSelfie ? 'scaleX(-1)' : 'none' }}
              />

              {/* Document frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Dark vignette */}
                <div className="absolute inset-0 bg-black/50" style={{
                  mask: 'radial-gradient(ellipse 72% 56% at 50% 50%, transparent 0%, black 100%)',
                  WebkitMask: 'radial-gradient(ellipse 72% 56% at 50% 50%, transparent 0%, black 100%)',
                }} />

                {/* Document frame */}
                <div
                  className="relative w-[82%] max-w-sm rounded-2xl transition-colors duration-300"
                  style={{
                    aspectRatio: isSelfie ? '3/4' : '1.586/1',
                    border: `3px solid ${frameColor}`,
                    boxShadow: `0 0 0 2px ${frameColor}40, 0 0 40px ${frameColor}30`,
                  }}
                >
                  {/* Corner brackets */}
                  {[
                    'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                    'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                    'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                    'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={`absolute w-8 h-8 ${cls}`}
                      style={{ borderColor: frameColor, margin: '-2px' }}
                    />
                  ))}

                  {/* Scanning line animation */}
                  {!analysis?.ready && (
                    <motion.div
                      animate={{ top: ['8%', '88%', '8%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-2 right-2 h-0.5 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${frameColor}, transparent)`,
                        boxShadow: `0 0 8px ${frameColor}`,
                      }}
                    />
                  )}

                  {/* Countdown badge */}
                  {countdown !== null && (
                    <motion.div
                      key={countdown}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                        style={{ background: '#22c55e', boxShadow: '0 0 30px #22c55e80' }}
                      >
                        {countdown}
                      </div>
                    </motion.div>
                  )}

                  {/* Ready checkmark */}
                  {analysis?.ready && countdown === null && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"
                        style={{ boxShadow: '0 0 20px #22c55e' }}
                      >
                        <Check className="w-6 h-6 text-white" />
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quality indicators (top right) */}
              {analysis && (
                <div className="absolute top-4 right-4 space-y-1.5 z-10">
                  {[
                    { label: ar ? 'حدة' : 'Sharp', value: analysis.blurScore },
                    { label: ar ? 'إضاءة' : 'Light', value: analysis.brightnessScore },
                    { label: ar ? 'تباين' : 'Contrast', value: analysis.contrastScore },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 bg-black/70 rounded-lg px-2 py-1">
                      <span className="text-white/60 text-[10px] w-12 text-right">{label}</span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{
                            width: `${value}%`,
                            background: value > 65 ? '#22c55e' : value > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span className="text-white text-[10px] w-6">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Captured image preview */}
          {capturedUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={capturedUrl}
                alt="captured"
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
        </div>

        {/* Guidance message */}
        {!capturedUrl && guidance && (
          <motion.div
            key={guidance.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="z-20 px-4 py-3 flex items-center gap-3 bg-black/90 border-t"
            style={{ borderColor: guidanceColor + '40' }}
          >
            <span className="text-2xl">{guidance.emoji}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: guidanceColor }}>{guidance.message}</p>
              <p className="text-xs text-white/50">{guidance.subMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Bottom controls */}
        <div className="z-20 px-6 py-5 bg-black flex items-center justify-center gap-8">
          {!capturedUrl ? (
            <>
              {/* Manual capture button */}
              <button
                onClick={doCapture}
                className="w-18 h-18 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                style={{ width: 72, height: 72 }}
              >
                <div className="w-14 h-14 rounded-full border-4 border-black flex items-center justify-center">
                  <Camera className="w-7 h-7 text-black" />
                </div>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-6 w-full">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 rounded-xl border border-white/20 flex items-center justify-center gap-2 text-white text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                {ar ? 'إعادة' : fr ? 'Reprendre' : 'Retake'}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-[#FF6B00] flex items-center justify-center gap-2 text-white text-sm font-semibold"
              >
                <Check className="w-4 h-4" />
                {ar ? 'تأكيد الصورة' : fr ? 'Confirmer' : 'Use Photo'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  