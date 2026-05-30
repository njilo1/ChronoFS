import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lightbulb, CheckCircle2, Check } from 'lucide-react';
import Modal from './Modal';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';

/**
 * Assistant de résolution — après génération, liste les cours non placés
 * avec POUR CHACUN : la (les) raison(s) et des suggestions concrètes.
 *
 * Niveau 1 (conseil) : on affiche raisons + suggestions.
 * Niveau 2 (action)  : chaque suggestion actionnable (qui porte jour/créneau/
 *   salle) a un bouton « Appliquer » → place le cours sur ce créneau APRÈS
 *   revalidation côté serveur. Rien n'est appliqué sans le clic du DAR.
 *
 * Props : open, onClose, result = { placees, non_placees: [...] },
 *         semaineId, onApplied (callback après un placement réussi).
 */
export default function AssistantResolutionModal({ open, onClose, result, semaineId, onApplied }) {
  const placees = result?.placees ?? 0;
  const [items, setItems]   = useState([]);
  const [busy, setBusy]     = useState(null);   // clé "demandeId-index" en cours

  // (Ré)initialise la liste à chaque nouveau résultat de génération.
  useEffect(() => {
    setItems(result?.non_placees ?? []);
  }, [result]);

  const handleApply = async (course, sugg, key) => {
    if (!semaineId) return;
    setBusy(key);
    try {
      await api.post(`/semaines/${semaineId}/placer-cours/`, {
        demande_id: course.demande_id,
        jour:       sugg.jour,
        creneau:    sugg.creneau,
        salle_id:   sugg.salle_id,
      });
      toast.success(`Cours placé : ${course.ue} (${sugg.label.replace(/^Déplacer à /, '').replace(/\.$/, '')}).`);
      // Le cours est résolu → on le retire de la liste.
      setItems((arr) => arr.filter((c) => c.demande_id !== course.demande_id));
      onApplied?.();
    } catch (err) {
      toast.error(extractApiError(err, "Impossible de placer ce cours (conflit ?)."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Assistant de résolution">
      {/* Résumé */}
      <div className="flex items-center gap-4 -mt-1">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 size={16} />
          <span className="text-sm font-semibold">{placees} cours placé{placees > 1 ? 's' : ''}</span>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">{items.length} non placé{items.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-center text-ink-muted dark:text-ink-dark-muted">
          <CheckCircle2 size={30} className="text-success" />
          <p className="text-sm font-medium">Tous les cours sont placés. Rien à résoudre 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
            Ces cours n'ont pas pu être placés. Voici pourquoi, et des pistes pour les caser.
            Cliquez <span className="font-semibold">« Appliquer »</span> pour placer le cours sur le créneau proposé
            (rien n'est modifié sans votre clic).
          </p>

          <AnimatePresence initial={false}>
            {items.map((c, i) => (
              <motion.div
                key={c.demande_id ?? i}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
                className="rounded-xl border border-line dark:border-line-dark bg-surface-alt/40 dark:bg-surface-dark-alt/40 p-3.5"
              >
                <div>
                  <p className="text-[13px] font-bold text-ink-strong dark:text-ink-dark-strong">
                    {c.ue} <span className="text-ink-muted dark:text-ink-dark-muted font-medium">· {c.type_cours}</span>
                  </p>
                  <p className="text-[11.5px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                    {c.classe} · {c.enseignant} · {c.jour} {c.creneau}
                  </p>
                </div>

                {c.raisons?.length > 0 && (
                  <div className="mt-2 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                    <ul className="text-[12px] text-ink dark:text-ink-dark space-y-0.5">
                      {c.raisons.map((r, k) => <li key={k}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {c.suggestions?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {c.suggestions.map((s, k) => {
                      const key = `${c.demande_id}-${k}`;
                      const actionnable = s.salle_id != null && s.jour != null;
                      return (
                        <div key={k} className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <Lightbulb size={13} className="text-primary-600 dark:text-primary-300 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-primary-800 dark:text-primary-200">{s.label}</span>
                          </div>
                          {actionnable && (
                            <button
                              onClick={() => handleApply(c, s, key)}
                              disabled={busy === key}
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold
                                         bg-primary-900 text-white hover:bg-primary-700 disabled:opacity-60
                                         dark:bg-primary-500 dark:text-page-dark dark:hover:bg-primary-400 transition-colors"
                            >
                              <Check size={12} /> {busy === key ? '…' : 'Appliquer'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}
