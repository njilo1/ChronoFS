import { useCrud } from '../../../hooks/useCrud';
import Table from '../../../components/ui/Table';

const COLS = [
  { key: 'code',     label: 'Code' },
  { key: 'intitule', label: 'Intitulé' },
  { key: 'filiere',  label: 'Filière',
    render: r => r.filiere ? `${r.filiere.code ?? ''} ${r.filiere.niveau ?? ''}`.trim() : '—' },
];

export default function ChefUEs() {
  const { data, loading } = useCrud('mon-departement/ues');

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-etext font-display text-2xl font-semibold">Mes Unités d'Enseignement</h1>
        <p className="text-emuted text-sm mt-0.5">UEs importées pour votre département</p>
      </div>
      <Table columns={COLS} data={data} loading={loading}
        emptyText="Aucune UE importée. Déposez votre fichier Excel pour commencer." />
    </div>
  );
}
