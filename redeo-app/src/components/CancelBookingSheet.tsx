import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function CancelBookingSheet({ open, route, busy, onClose, onConfirm }: {
  open: boolean; route?: string; busy?: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const { t, dir } = useI18n();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
          <motion.div dir={dir} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full sm:max-w-sm bg-[#1B1F27] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4"><TriangleAlert className="w-6 h-6 text-red-400" /></div>
            <h3 className="text-lg font-bold text-white mb-1">{t('book.cancel_title')}</h3>
            {route && <p className="text-sm text-[#FF6B00] font-medium mb-2">{route}</p>}
            <p className="text-sm text-[#A0A0A0] mb-6">{t('book.cancel_desc')}</p>
            <div className="flex flex-col gap-2">
              <button disabled={busy} onClick={onConfirm} className="h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('book.cancel_yes')}
              </button>
              <button disabled={busy} onClick={onClose} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">{t('book.cancel_keep')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
