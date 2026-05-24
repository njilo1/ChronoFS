import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
  open, onClose, title, children,
  onConfirm, confirmLabel = 'Enregistrer', loading = false,
}) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-ecard border border-eborder rounded-xl z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-eborder">
              <h3 className="text-etext font-display text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="text-emuted hover:text-etext transition-colors">
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">{children}</div>

            {/* Footer */}
            {onConfirm && (
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-eborder">
                <Button variant="secondary" onClick={onClose} size="sm">Annuler</Button>
                <Button onClick={onConfirm} disabled={loading} size="sm">
                  {loading ? 'Enregistrement…' : confirmLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
