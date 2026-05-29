import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import useToastStore from '../../store/toastStore';

/**
 * Pile de toasts en bas à droite. Entrée par glissement depuis la droite
 * avec léger rebond (spring), conforme à la charte de motion du projet.
 * Couleurs sémantiques uniquement (succès/erreur/alerte/info) — l'or
 * institutionnel n'est pas utilisé ici, ce sont des états.
 */
const CONFIG = {
  success: { Icon: CheckCircle2,  accent: '#0F6B45', titre: 'Succès' },
  error:   { Icon: AlertCircle,   accent: '#B91C1C', titre: 'Erreur' },
  warning: { Icon: AlertTriangle, accent: '#B45309', titre: 'Attention' },
  info:    { Icon: Info,          accent: '#0369A1', titre: 'Information' },
};

function ToastCard({ toast, onDismiss }) {
  const { Icon, accent, titre } = CONFIG[toast.type] ?? CONFIG.info;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,   scale: 1   }}
      exit={{    opacity: 0, x: 120, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="pointer-events-auto relative flex items-start gap-3 w-[330px] max-w-[86vw]
                 bg-surface dark:bg-surface-dark border border-line dark:border-line-dark
                 rounded-lg shadow-card-lg pl-4 pr-3 py-3 overflow-hidden"
    >
      {/* Liseré coloré à gauche */}
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <Icon size={18} strokeWidth={2} style={{ color: accent }} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold tracking-wide" style={{ color: accent }}>
          {toast.title ?? titre}
        </p>
        <p className="text-[13px] leading-snug mt-0.5 text-ink dark:text-ink-dark break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        className="shrink-0 p-1 -mr-0.5 text-ink-subtle dark:text-ink-dark-subtle
                   hover:text-ink-strong dark:hover:text-ink-dark-strong
                   hover:bg-surface-alt dark:hover:bg-surface-dark-alt rounded transition-colors"
      >
        <X size={14} strokeWidth={1.8} />
      </button>
    </motion.div>
  );
}

export default function Toaster() {
  const toasts  = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
