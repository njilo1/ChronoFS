import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, CalendarOff } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';

const JOURS = [[0, 'Lundi'], [1, 'Mardi'], [2, 'Mercredi'], [3, 'Jeudi'], [4, 'Vendredi'], [5, 'Samedi']];
const CRENEAUX = [[0, '7h30-10h00'], [1, '10h15-12h45'], [2, '13h00-15h30'], [3, '15h45-18h15']];

const arr = (r) => (Array.isArray(r.data) ? r.data : (r.data?.results ?? []));
const fmtSemaine = (s) => {
  const d = (x) => new Date(x).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `Semaine du ${d(s.date_debut)} au ${d(s.date_fin)}`;
};

/**
 * Signaler / gérer les absences PONCTUELLES d'un enseignant.
 * Props : open, onClose, enseignant = { id, nom }.
 */
export default function AbsenceModal({ open, onClose, enseignant }) {
  const [items, setItems]       = useState([]);
  const [semaines, setSemaines] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ semaine: '', jour: '0', creneau: '', motif: '' });

  useEffect(() => {
    if (!open || !enseignant) return;
    setForm({ semaine: '', jour: '0', creneau: '', motif: '' });
    setLoading(true);
    Promise.all([
      api.get(`/mon-departement/indisponibilites/?enseignant=${enseignant.id}`),
      api.get('/semaines/'),
    ]).then(([ind, sw]) => {
      setItems(arr(ind));
      // On ne propose pas les semaines archivées.
      setSemaines(arr(sw).filter((s) => s.statut !== 'ARCHIVE'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, enseignant]);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!form.semaine) { toast.error('Choisissez la semaine de l’absence.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/mon-departement/indisponibilites/', {
        enseignant: enseignant.id,
        type:       'PONCTUELLE',
        semaine:    Number(form.semaine),
        jour:       Number(form.jour),
        creneau:    form.creneau === '' ? null : Number(form.creneau),
        motif:      form.motif,
      });
      setItems((a) => [data, ...a]);
      setForm({ semaine: '', jour: '0', creneau: '', motif: '' });
      toast.success('Absence enregistrée.');
    } catch (err) {
      toast.error(extractApiError(err, "Impossible d'enregistrer l'absence."));
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (id) => {
    try {
      await api.delete(`/mon-departement/indisponibilites/${id}/`);
      setItems((a) => a.filter((x) => x.id !== id));
      toast.success('Absence retirée.');
    } catch (err) {
      toast.error(extractApiError(err, 'Échec de la suppression.'));
    }
  };

  const iCls = 'w-full bg-surface-alt dark:bg-surface-dark-alt border border-line dark:border-line-dark rounded-lg px-3 py-2 text-sm text-ink dark:text-ink-dark focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';
  const lbl  = 'text-ink-muted dark:text-ink-dark-muted text-[10px] font-semibold mb-1 block uppercase tracking-widest';

  return (
    <Modal open={open} onClose={onClose} title={`Absences — ${enseignant?.nom ?? ''}`}>
      {/* Formulaire d'ajout */}
      <form onSubmit={ajouter} className="space-y-3">
        <div>
          <label className={lbl}>Semaine</label>
          <select className={iCls} value={form.semaine}
            onChange={(e) => setForm((f) => ({ ...f, semaine: e.target.value }))} required>
            <option value="">— Choisir une semaine —</option>
            {semaines.map((s) => <option key={s.id} value={s.id}>{fmtSemaine(s)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Jour</label>
            <select className={iCls} value={form.jour}
              onChange={(e) => setForm((f) => ({ ...f, jour: e.target.value }))}>
              {JOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Créneau</label>
            <select className={iCls} value={form.creneau}
              onChange={(e) => setForm((f) => ({ ...f, creneau: e.target.value }))}>
              <option value="">Journée entière</option>
              {CRENEAUX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Motif (optionnel)</label>
          <input className={iCls} value={form.motif}
            onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
            placeholder="mission, maladie…" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving}>
            <Plus size={14} /> {saving ? 'Ajout…' : "Ajouter l'absence"}
          </Button>
        </div>
      </form>

      <div className="border-t border-line dark:border-line-dark" />

      {/* Liste des absences existantes */}
      <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em]">
        Absences enregistrées
      </p>
      {loading ? (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted py-3">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-2 text-ink-muted dark:text-ink-dark-muted">
          <CalendarOff size={24} strokeWidth={1.4} />
          <p className="text-sm">Aucune absence enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.div key={it.id} layout
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                className="flex items-center justify-between gap-3 rounded-lg border border-line dark:border-line-dark px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink dark:text-ink-dark">
                    {it.jour_display} · {it.creneau_display}
                  </p>
                  <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted truncate">
                    {it.motif || 'Sans motif'}
                  </p>
                </div>
                <button onClick={() => supprimer(it.id)} title="Retirer"
                  className="shrink-0 p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/5 transition-colors">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Modal>
  );
}
