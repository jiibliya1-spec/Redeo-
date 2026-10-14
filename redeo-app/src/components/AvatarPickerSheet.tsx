import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ImagePlus, Info, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const SEEDS = ['Amine', 'Yasmine', 'Karim', 'Salma', 'Youssef', 'Nadia', 'Omar', 'Imane', 'Hamza', 'Khadija', 'Mehdi', 'Sara',
  'Adam', 'Lina', 'Ayoub', 'Meryem', 'Anas', 'Zineb', 'Bilal', 'Hajar', 'Rayan', 'Ikram', 'Walid', 'Soukaina'];

export const AVATAR_OPTIONS = SEEDS.map((s) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`);

interface Props {
  open: boolean; onClose: () => void; current?: string | null; isPassenger: boolean;
  onGallery: () => void; onCamera: () => void; onPick: (url: string) => void;
}

export function AvatarPickerSheet({ open, onClose, current, isPassenger, onGallery, onCamera, onPick }: Props) {
  const { t, dir } = useI18n();
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} dir={dir}
          className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-7 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">{t('avatar.title')}</h2>
                <p className="text-xs text-[#A0A0A0] mt-0.5">{t('avatar.sub')}</p>
              </div>
              <button onClick={onClose} className="p-1.5 -m-1.5 text-[#A0A0A0] hover:text-white" aria-label="close"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={onGallery} className="flex flex-col items-center gap-2 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/25 py-4 hover:bg-[#FF6B00]/15 transition-colors">
                <ImagePlus className="w-6 h-6 text-[#FF6B00]" />
                <span className="text-sm font-medium text-white">{t('avatar.upload')}</span>
              </button>
              <button onClick={onCamera} className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-4 hover:bg-white/10 transition-colors">
                <Camera className="w-6 h-6 text-white" />
                <span className="text-sm font-medium text-white">{t('avatar.camera')}</span>
              </button>
            </div>

            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">{t('avatar.choose')}</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map((url) => {
                const on = current === url;
                return (
                  <button key={url} onClick={() => onPick(url)}
                    className={`relative aspect-square rounded-full overflow-hidden bg-[#0F1115] transition-all ${on ? 'ring-2 ring-[#FF6B00] scale-95' : 'ring-1 ring-white/10 hover:ring-white/30'}`}>
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {on && <span className="absolute inset-0 bg-black/30 flex items-center justify-center"><Check className="w-5 h-5 text-white" /></span>}
                  </button>
                );
              })}
            </div>

            {isPassenger && (
              <div className="flex gap-2 mt-5 rounded-xl bg-yellow-500/5 border border-yellow-500/15 px-3 py-2.5">
                <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80 leading-relaxed">{t('avatar.note')}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
