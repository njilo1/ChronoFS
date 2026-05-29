// Grille officielle UEB : 6 jours × (4 créneaux + 3 pauses intercalées).
//
// Drag-and-drop : si `onMove` est fourni, les cellules de cours deviennent
// draggables et les cellules vides droppables. Le parent reçoit
// `onMove(seanceId, newJour, newCreneau)` et gère l'appel backend.
// Édition : si `onEdit` est fourni, un clic simple sur une séance appelle
// `onEdit(seance)` (le parent ouvre la modale). Le clic est ignoré juste
// après un glisser réel pour ne pas ouvrir la modale à la fin d'un drag.
// Si `onMove` et `onEdit` sont absents → grille lecture seule (vue chef).

import { useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const ROWS = [
  { type: 'cours', index: 0, horaire: '7h30 – 10h00' },
  { type: 'pause',            horaire: '10h00 – 10h15' },
  { type: 'cours', index: 1, horaire: '10h15 – 12h45' },
  { type: 'pause',            horaire: '12h45 – 13h00' },
  { type: 'cours', index: 2, horaire: '13h00 – 15h30' },
  { type: 'pause',            horaire: '15h30 – 15h45' },
  { type: 'cours', index: 3, horaire: '15h45 – 18h15' },
];

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/* ─── Carte d'une séance (draggable si onMove fourni) ─────────────────── */
function CarteSeance({ seance, draggable, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `seance-${seance.id}`,
    data: { seance },
    disabled: !draggable,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={onEdit ? () => onEdit(seance) : undefined}
      title={onEdit ? 'Cliquer pour modifier · glisser pour déplacer' : undefined}
      className={
        'space-y-0.5 min-h-[60px] p-1 rounded-lg bg-primary-50 border border-primary-100 ' +
        (draggable ? 'cursor-grab active:cursor-grabbing select-none ' : '') +
        (onEdit && !draggable ? 'cursor-pointer ' : '') +
        (onEdit ? 'hover:border-primary-300 hover:bg-primary-100/70 transition-colors ' : '') +
        (isDragging ? 'opacity-40 ring-2 ring-primary-400 ' : '')
      }
    >
      <div className="font-bold text-ink-strong leading-tight text-[11px]">
        {seance.filiere_libelle ?? `${seance.filiere?.nom ?? ''} ${seance.filiere?.niveau ?? ''}`.trim()}
      </div>
      <div className="text-primary-700 font-semibold text-[10px]">
        {seance.ue_code ?? seance.ue?.code ?? ''}
      </div>
      <div className="text-ink-muted leading-tight line-clamp-2 text-[10px]">
        {seance.ue_intitule ?? seance.ue?.intitule ?? ''}
      </div>
      <div className="text-ink-subtle italic text-[10px]">
        {seance.enseignant_nom ?? (
          seance.enseignant
            ? `${seance.enseignant.grade ? seance.enseignant.grade + ' ' : ''}${seance.enseignant.nom}`
            : '—'
        )}
      </div>
      {(seance.salle_nom ?? seance.salle?.nom) && (
        <div className="text-[10px] text-accent-600 font-medium">
          Salle {seance.salle_nom ?? seance.salle.nom}
        </div>
      )}
    </div>
  );
}

/* ─── Cellule droppable (jour × créneau) ─────────────────────────────── */
function CelluleCours({ jourIdx, creneauIdx, seances, droppable, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${jourIdx}-${creneauIdx}`,
    data: { jour: jourIdx, creneau: creneauIdx },
    disabled: !droppable,
  });

  return (
    <td
      ref={setNodeRef}
      className={
        'border-r last:border-r-0 border-line/40 px-2 py-2 align-top transition-colors ' +
        (isOver ? 'bg-primary-100/50 ring-2 ring-primary-400 ring-inset ' : '')
      }
    >
      {seances.length === 0 ? null : (
        <div className="space-y-1.5">
          {seances.map((s) => (
            <CarteSeance key={s.id} seance={s} draggable={droppable} onEdit={onEdit} />
          ))}
        </div>
      )}
    </td>
  );
}

/* ─── Composant principal ─────────────────────────────────────────────── */
export default function GrilleEDT({ seances = [], onMove, onEdit }) {
  // Index multi-valeurs : plusieurs séances peuvent occuper le même
  // créneau (différentes salles). On les empile dans la cellule.
  const idx = {};
  seances.forEach((s) => {
    const k = `${s.creneau}-${s.jour}`;
    (idx[k] ||= []).push(s);
  });

  const draggable = typeof onMove === 'function';
  const editable  = typeof onEdit === 'function';
  const interactif = draggable || editable;

  // Vrai juste après un glisser réel : permet d'ignorer le clic de fin de
  // drag pour ne pas ouvrir la modale d'édition par accident.
  const justDragged = useRef(false);

  // Pointer sensor : 6 px de mouvement minimum pour distinguer un clic
  // (édition) d'un drag réel — évite les déplacements involontaires.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart() {
    justDragged.current = true;
  }

  function handleDragEnd(event) {
    // Laisse passer le cycle de clic courant avant de réautoriser l'édition.
    setTimeout(() => { justDragged.current = false; }, 60);
    if (!draggable || !event.over) return;
    const seance = event.active.data.current?.seance;
    const cible  = event.over.data.current;
    if (!seance || !cible) return;
    if (seance.jour === cible.jour && seance.creneau === cible.creneau) return;
    onMove(seance.id, cible.jour, cible.creneau);
  }

  const handleEdit = editable
    ? (seance) => { if (!justDragged.current) onEdit(seance); }
    : undefined;

  const tableau = (
    <div className="overflow-x-auto rounded-xl border border-line shadow-card bg-white">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-primary-50 border-b border-line">
            <th className="border-r border-line px-3 py-2.5 text-primary-700 font-semibold text-center w-24 text-[11px] uppercase tracking-wider">
              Horaires
            </th>
            {JOURS.map((j) => (
              <th key={j} className="border-r border-line last:border-r-0 px-3 py-2.5 text-primary-700 font-semibold text-center text-[11px] uppercase tracking-wider">
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => {
            if (row.type === 'pause') {
              return (
                <tr key={ri} className="bg-surface-alt">
                  <td className="border-r border-t border-line/40 px-3 py-1 text-center text-ink-subtle italic text-[10px]">
                    {row.horaire}
                  </td>
                  {JOURS.map((_, ji) => (
                    <td key={ji} className="border-r last:border-r-0 border-t border-line/40 bg-surface-alt" />
                  ))}
                </tr>
              );
            }

            return (
              <tr key={ri} className="border-t border-line/60">
                <td className="border-r border-line px-3 py-3 text-center font-semibold text-ink-muted bg-surface-alt/60 align-middle text-[11px] whitespace-nowrap">
                  {row.horaire}
                </td>
                {[0, 1, 2, 3, 4, 5].map((jourIdx) => (
                  <CelluleCours
                    key={jourIdx}
                    jourIdx={jourIdx}
                    creneauIdx={row.index}
                    seances={idx[`${row.index}-${jourIdx}`] ?? []}
                    droppable={draggable}
                    onEdit={handleEdit}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!interactif) return tableau;
  // Sans drag-drop (édition seule) on n'enveloppe pas dans un DndContext.
  if (!draggable) return tableau;
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {tableau}
    </DndContext>
  );
}
