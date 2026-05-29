import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal — Portal + wrapper flex pour centrage.
 *
 * Bug précédent : framer-motion applique son propre `transform` sur le
 * motion.div (via `animate={{ scale, y }}`), ce qui écrasait les classes
 * Tailwind `-translate-x-1/2 -translate-y-1/2`. Résultat : le coin
 * haut-gauche était à 50%/50% (la modale partait en bas-droite).
 *
 * Solution : un wrapper plain `<div>` en `fixed inset-0` + flex centering,
 * et un motion.div enfant qui ne fait QUE l'animation (scale/opacity/y).
 * Plus aucun conflit de transform.
 */
export default function Modal({
  open, onClose, title, children,
  onConfirm, confirmLabel = 'Enregistrer', loading = false,
}) {
  // Vrai si le bouton de souris a été pressé sur la zone vide (et non sur le
  // contenu). On ne ferme au clic que si press ET release y ont lieu.
  const pressOnVoid = useRef(false);

  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open, onClose]);

  // Bloque le scroll du body quand la modale est ouverte
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop — purement visuel, pas de handler (la fermeture est
              gérée par la zone de centrage ci-dessous, qui exige que le clic
              COMMENCE et FINISSE dans le vide. Évite les fermetures
              accidentelles lors d'une interaction avec un widget natif comme
              le calendrier d'un <input type="date">). */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink-strong/60 dark:bg-black/70"
          />

          {/* Centrage flex — clic dans le vide ⇒ fermeture (si press+release
              sur cette zone exactement). */}
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onMouseDown={(e) => { pressOnVoid.current = e.target === e.currentTarget; }}
            onClick={(e) => {
              if (pressOnVoid.current && e.target === e.currentTarget) onClose?.();
              pressOnVoid.current = false;
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 440, damping: 32 }}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-[460px] max-h-[90vh] bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-md shadow-card-lg flex flex-col overflow-hidden"
            >
              {/* Header — non scrollable */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <h3 className="heading-display text-[1.35rem] text-ink-strong dark:text-ink-dark-strong leading-tight">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Fermer"
                  className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-ink-strong dark:hover:text-ink-dark-strong hover:bg-surface-alt dark:hover:bg-surface-dark-alt rounded transition-all"
                >
                  <X size={15} strokeWidth={1.6} />
                </button>
              </div>
              <div className="px-5 shrink-0">
                <div className="border-t border-line dark:border-line-dark" />
              </div>

              {/* Body — scrollable si trop de contenu */}
              <div className="px-5 py-5 space-y-4 text-ink dark:text-ink-dark overflow-y-auto flex-1 min-h-0">
                {children}
              </div>

              {/* Footer — non scrollable, reste toujours visible */}
              {onConfirm && (
                <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-line dark:border-line-dark bg-surface-subtle dark:bg-surface-dark-subtle shrink-0">
                  <Button variant="secondary" onClick={onClose} size="sm">Annuler</Button>
                  <Button onClick={onConfirm} disabled={loading} size="sm">
                    {loading ? 'Enregistrement…' : confirmLabel}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
