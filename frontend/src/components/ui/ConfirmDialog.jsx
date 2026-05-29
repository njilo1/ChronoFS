import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

/**
 * ConfirmDialog — même pattern que Modal : Portal + wrapper flex pour
 * éviter tout conflit de transform avec framer-motion.
 */
export default function ConfirmDialog({
  open, title, description,
  onConfirm, onCancel,
  confirmLabel = 'Supprimer',
  variant = 'danger',
}) {
  const isDanger = variant === 'danger';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-ink-strong/60 dark:bg-black/70"
            onClick={onCancel}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 8,  scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              role="alertdialog"
              aria-modal="true"
              className="pointer-events-auto w-full max-w-sm bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-md shadow-card-lg overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-3 mb-5">
                  <div className={
                    'p-2 rounded-md shrink-0 border ' +
                    (isDanger
                      ? 'bg-danger/8 border-danger/25'
                      : 'bg-primary-50 border-primary-100 dark:bg-primary-900/30 dark:border-primary-800/60')
                  }>
                    <AlertTriangle size={16} strokeWidth={1.7}
                      className={isDanger ? 'text-danger' : 'text-primary-700 dark:text-primary-200'} />
                  </div>
                  <div>
                    <p className="heading-display text-[1.15rem] text-ink-strong dark:text-ink-dark-strong leading-snug">{title}</p>
                    {description && (
                      <p className="text-ink-muted dark:text-ink-dark-muted text-xs mt-1 leading-relaxed">{description}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={onCancel}>Annuler</Button>
                  <Button variant={isDanger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
