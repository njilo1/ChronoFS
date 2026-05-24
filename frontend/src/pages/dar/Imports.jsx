import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../services/api';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const COLS = [
  { key: 'departement', label: 'Département',
    render: r => r.departement?.nom ?? r.departement ?? '—' },
  { key: 'semaine', label: 'Semaine',
    render: r => r.semaine ? new Date(r.semaine.date_debut ?? r.semaine).toLocaleDateString('fr-FR') : '—' },
  { key: 'statut', label: 'Statut', render: r => <Badge status={r.statut} /> },
  { key: 'nb_ues',    label: 'UEs',     render: r => r.nb_ues ?? '—' },
  { key: 'nb_erreurs',label: 'Erreurs', render: r => r.nb_erreurs ?? '—' },
  { key: 'created_at', label: 'Date',
    render: r => r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—' },
];

export default function Imports() {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/imports/');
      setImports(Array.isArray(data) ? data : (data.results ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Imports</h1>
          <p className="text-emuted text-sm mt-0.5">Fichiers importés par les chefs de département</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={13} /> Rafraîchir
        </Button>
      </div>

      <Table columns={COLS} data={imports} loading={loading}
        emptyText="Aucun import reçu pour le moment." />
    </div>
  );
}
