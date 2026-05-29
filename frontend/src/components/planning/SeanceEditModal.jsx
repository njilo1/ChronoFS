import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';

const iCls = 'input-field';
function F({ label, children, hint }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-ink-subtle mt-1">{hint}</p>}
    </div>
  );
}

const TYPES_COURS = [
  ['CM', 'Cours magistral'],
  ['TD', 'Travaux dirigés'],
  ['TP', 'Travaux pratiques'],
  ['SEMINAIRE', 'Séminaire'],
  ['PROJET', 'Projet'],
];

/**
 * Modale d'édition manuelle d'une séance (clic sur un créneau de la grille).
 *
 * On ne modifie QUE le contenu pédagogique : enseignant, salle, type de
 * cours et UE — tous choisis dans des listes issues de la base. Le code et
 * l'intitulé ne sont jamais saisis librement : ils suivent l'UE choisie.
 * Le déplacement jour/créneau, lui, se fait par glisser-déposer.
 *
 * Props :
 *   seance       : objet séance (SeanceSerializer) ou null (fermé)
 *   enseignants  : liste complète des enseignants
 *   salles       : liste complète des salles
 *   ues          : liste complète des UE
 *   onSave(patch): Promise — le parent fait le PATCH + toast ; rejette si refus
 *   onClose()
 */
export default function SeanceEditModal({ seance, enseignants = [], salles = [], ues = [], onSave, onClose }) {
  const [form, setForm]     = useState({ ue: '', enseignant: '', salle: '', type_cours: 'CM' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!seance) return;
    setForm({
      ue:         seance.ue ?? '',
      enseignant: seance.enseignant ?? '',
      salle:      seance.salle ?? '',
      type_cours: seance.type_cours ?? 'CM',
    });
  }, [seance]);

  // UE limitées à la filière de la séance (on remplace par un cours de la même classe).
  const uesFiliere = useMemo(
    () => ues.filter(u => (u.filiere?.id ?? u.filiere) === seance?.filiere),
    [ues, seance],
  );

  // Salles de la même ville que la filière (contrainte H7 — la ville est
  // celle de la salle actuelle, puisque la génération la respecte déjà).
  const sallesVille = useMemo(
    () => salles.filter(s => (s.campus?.ville ?? s.campus_ville) === seance?.salle_ville),
    [salles, seance],
  );

  // Le code + l'intitulé affichés découlent de l'UE sélectionnée.
  const ueChoisie = uesFiliere.find(u => u.id === Number(form.ue)) ??
                    (seance ? { code: seance.ue_code, intitule: seance.ue_intitule } : null);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave({
        ue:         Number(form.ue),
        enseignant: form.enseignant ? Number(form.enseignant) : null,
        salle:      Number(form.salle),
        type_cours: form.type_cours,
      });
      onClose();
    } catch {
      /* message d'erreur affiché en toast par le parent ; on garde la modale */
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={!!seance}
      onClose={onClose}
      title="Modifier la séance"
      onConfirm={handleConfirm}
      loading={saving}
    >
      {seance && (
        <>
          {/* Contexte non modifiable : classe + position dans la semaine */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-primary-50 text-primary-800 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60">
              {seance.filiere_libelle}
            </span>
            <span className="text-ink-muted dark:text-ink-dark-muted">
              {seance.jour_display} · {seance.creneau_display}
            </span>
          </div>

          <F label="Unité d'enseignement (UE)">
            <select className={iCls} value={form.ue}
              onChange={e => setForm({ ...form, ue: e.target.value })}>
              {uesFiliere.length === 0 && <option value={seance.ue}>{seance.ue_code}</option>}
              {uesFiliere.map(u => (
                <option key={u.id} value={u.id}>{u.code} — {u.intitule}</option>
              ))}
            </select>
          </F>

          {/* Code + intitulé : lecture seule, suivent l'UE choisie */}
          <div className="grid grid-cols-3 gap-3">
            <F label="Code">
              <input className={iCls + ' bg-surface-alt dark:bg-surface-dark-alt'} value={ueChoisie?.code ?? '—'} readOnly tabIndex={-1} />
            </F>
            <div className="col-span-2">
              <F label="Intitulé (auto)">
                <input className={iCls + ' bg-surface-alt dark:bg-surface-dark-alt'} value={ueChoisie?.intitule ?? '—'} readOnly tabIndex={-1} />
              </F>
            </div>
          </div>

          <F label="Enseignant">
            <select className={iCls} value={form.enseignant}
              onChange={e => setForm({ ...form, enseignant: e.target.value })}>
              <option value="">Non assigné</option>
              {enseignants.map(en => (
                <option key={en.id} value={en.id}>{en.nom_complet ?? `${en.grade} ${en.nom}`}</option>
              ))}
            </select>
          </F>

          <div className="grid grid-cols-2 gap-3">
            <F label="Salle" hint={`Ville : ${seance.salle_ville === 'MONATELE' ? 'Monatélé' : 'Ébolowa'}`}>
              <select className={iCls} value={form.salle}
                onChange={e => setForm({ ...form, salle: e.target.value })}>
                {sallesVille.length === 0 && <option value={seance.salle}>{seance.salle_nom}</option>}
                {sallesVille.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nom} — {s.campus?.nom ?? s.campus_nom} ({s.capacite} pl.)
                  </option>
                ))}
              </select>
            </F>
            <F label="Type de cours">
              <select className={iCls} value={form.type_cours}
                onChange={e => setForm({ ...form, type_cours: e.target.value })}>
                {TYPES_COURS.map(([v, lib]) => <option key={v} value={v}>{lib}</option>)}
              </select>
            </F>
          </div>
        </>
      )}
    </Modal>
  );
}
