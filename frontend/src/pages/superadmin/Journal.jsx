import { useState, useEffect } from 'react';
import { ScrollText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import Table from '../../components/ui/Table';
import api from '../../services/api';

const STATUT_TONE = {
  OPTIMAL:   'text-success',
  FEASIBLE:  'text-info',
  INFEASIBLE:'text-danger',
  INTERROMPU:'text-warning',
};

function tauxColor(t) {
  if (t >= 90) return 'text-success';
  if (t >= 60) return 'text-warning';
  return 'text-danger';
}

export default function Journal() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let all = [], page = 1;
        for (;;) {
          const res = await api.get('/journal-generation/', { params: { page, page_size: 200 } });
          if (Array.isArray(res.data)) { all = res.data; break; }
          all = all.concat(res.data.results ?? []);
          if (!res.data.next) break;
          page += 1;
        }
        setRows(all);
      } catch { /* silencieux */ }
      finally { setLoading(false); }
    })();
  }, []);

  const COLS = [
    { key: 'lancee_le', label: 'Date', render: r => (
      <span className="text-xs text-ink-muted dark:text-ink-dark-muted whitespace-nowrap">
        {new Date(r.lancee_le).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
    { key: 'semaine_libelle', label: 'Semaine', render: r => (
      <span className="text-xs font-semibold text-ink-strong dark:text-ink-dark-strong whitespace-nowrap">{r.semaine_libelle}</span>
    )},
    { key: 'lancee_par_nom', label: 'Par', render: r => (
      <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.lancee_par_nom ?? '—'}</span>
    )},
    { key: 'taux', label: 'Taux', render: r => (
      <span className={`num font-bold ${tauxColor(r.taux)}`}>{Math.round(r.taux)}%</span>
    )},
    { key: 'placees', label: 'Placées', render: r => (
      <span className="num text-xs text-ink dark:text-ink-dark">{r.nb_placees}/{r.nb_demandes}</span>
    )},
    { key: 'duree_ms', label: 'Durée', render: r => (
      <span className="inline-flex items-center gap-1 num text-xs text-ink-muted dark:text-ink-dark-muted">
        <Clock size={11} />{(r.duree_ms / 1000).toFixed(1)}s
      </span>
    )},
    { key: 'statut_solver', label: 'Solveur', render: r => (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${STATUT_TONE[r.statut_solver] ?? 'text-ink-muted'}`}>
        {r.statut_solver === 'OPTIMAL' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
        {r.statut_solver || '—'}
      </span>
    )},
    { key: '_cfg', label: 'Config', render: r => (
      <span className="text-[11px] text-ink-subtle dark:text-ink-dark-subtle whitespace-nowrap">
        {(r.regles_appliquees?.length ?? 0)} règles · {(r.objectifs_appliques?.length ?? 0)} objectifs
      </span>
    )},
  ];

  return (
    <PageShell
      icon={ScrollText}
      eyebrow="Configuration du solver"
      title="Journal des générations"
      subtitle="Historique d'audit : configuration appliquée et résultat de chaque génération"
      count={loading ? null : rows.length}
    >
      <Table columns={COLS} data={rows} loading={loading}
        emptyText="Aucune génération enregistrée pour l'instant." />
    </PageShell>
  );
}
