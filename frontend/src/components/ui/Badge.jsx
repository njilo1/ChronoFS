import { clsx } from 'clsx';

const MAP = {
  DRAFT:            { bg: 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark',         dot: 'bg-ink-subtle dark:bg-ink-dark-subtle', pulse: false },
  IMPORTS_OUVERTS:  { bg: 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60', dot: 'bg-primary-700 dark:bg-primary-300',     pulse: true  },
  IMPORTS_CLOTURES: { bg: 'bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/30',                  dot: 'bg-warning',                              pulse: false },
  GENERE:           { bg: 'bg-gold-100 text-gold-700 border-gold-200 dark:bg-gold-500/15 dark:text-gold-300 dark:border-gold-500/30',                  dot: 'bg-gold-500',                             pulse: true  },
  PUBLIE:           { bg: 'bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success dark:border-success/30',                  dot: 'bg-success',                              pulse: false },
  EN_ATTENTE:       { bg: 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark',         dot: 'bg-ink-subtle dark:bg-ink-dark-subtle',  pulse: false },
  EN_COURS:         { bg: 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60', dot: 'bg-primary-700 dark:bg-primary-300',     pulse: true  },
  OK:               { bg: 'bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success dark:border-success/30',                  dot: 'bg-success',                              pulse: false },
  AVEC_ERREURS:     { bg: 'bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/30',                  dot: 'bg-warning',                              pulse: false },
  ECHEC:            { bg: 'bg-danger/10 text-danger border-danger/20 dark:bg-danger/15 dark:text-danger dark:border-danger/30',                        dot: 'bg-danger',                               pulse: false },
};

const LABELS = {
  DRAFT: 'Brouillon', IMPORTS_OUVERTS: 'Imports ouverts',
  IMPORTS_CLOTURES: 'Clôturés', GENERE: 'Généré', PUBLIE: 'Publié',
  EN_ATTENTE: 'En attente', EN_COURS: 'En cours',
  OK: 'Réussi', AVEC_ERREURS: 'Avec erreurs', ECHEC: 'Échec',
};

export default function Badge({ status, label, className, dot = true }) {
  const cfg = MAP[status] ?? {
    bg: 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark',
    dot: 'bg-ink-subtle',
    pulse: false,
  };
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border font-semibold leading-snug',
      cfg.bg, className
    )}>
      {dot && (
        <span className={clsx('pulse-dot', cfg.dot)} style={!cfg.pulse ? { animation: 'none' } : undefined} />
      )}
      <span className="tracking-wide">{label ?? LABELS[status] ?? status ?? '—'}</span>
    </span>
  );
}
