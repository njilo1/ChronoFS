import { useCrud } from '../../../hooks/useCrud';
import Table from '../../../components/ui/Table';

const COLS = [
  { key: 'grade', label: 'Grade' },
  { key: 'nom',   label: 'Nom' },
  { key: 'departements', label: 'Dép.',
    render: r => (r.departements ?? []).map(d => d.code ?? d).join(', ') || '—' },
];

export default function ChefEnseignants() {
  const { data, loading } = useCrud('mon-departement/enseignants');

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-etext font-display text-2xl font-semibold">Mes Enseignants</h1>
        <p className="text-emuted text-sm mt-0.5">Enseignants rattachés à votre département</p>
      </div>
      <Table columns={COLS} data={data} loading={loading}
        emptyText="Aucun enseignant enregistré pour votre département." />
    </div>
  );
}
