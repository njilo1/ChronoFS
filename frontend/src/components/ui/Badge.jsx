import { clsx } from 'clsx';

const MAP = {
  DRAFT:            'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  IMPORTS_OUVERTS:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  IMPORTS_CLOTURES: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  GENERE:           'bg-violet-500/15 text-violet-400 border-violet-500/25',
  PUBLIE:           'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  EN_ATTENTE:       'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  EN_COURS:         'bg-blue-500/15 text-blue-400 border-blue-500/25',
  OK:               'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  AVEC_ERREURS:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  ECHEC:            'bg-red-500/15 text-red-400 border-red-500/25',
};

const LABELS = {
  DRAFT: 'Brouillon', IMPORTS_OUVERTS: 'Imports ouverts',
  IMPORTS_CLOTURES: 'Clôturés', GENERE: 'Généré', PUBLIE: 'Publié',
  EN_ATTENTE: 'En attente', EN_COURS: 'En cours',
  OK: 'Réussi', AVEC_ERREURS: 'Avec erreurs', ECHEC: 'Échec',
};

export default function Badge({ status, label, className }) {
  const color = MAP[status] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25';
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-[11px] border font-medium', color, className)}>
      {label ?? LABELS[status] ?? status ?? '—'}
    </span>
  );
}
