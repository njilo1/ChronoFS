import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const iCls = 'w-full bg-ebg border border-eborder rounded-lg px-3 py-2 text-sm text-etext focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all';
function F({ label, children }) {
  return <div><label className="text-emuted text-xs mb-1 block">{label}</label>{children}</div>;
}

const BLANK = { nom: '', code: '' };
const COLS = [
  { key: 'code', label: 'Code' },
  { key: 'nom',  label: 'Département' },
];

export default function Departements() {
  const { data, loading, create, update, remove } = useCrud('departements');
  const [modal, setModal] = useState({ open: false, item: null });
  const [form, setForm]   = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => { setForm({ nom: item.nom, code: item.code }); setModal({ open: true, item }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Départements</h1>
          <p className="text-emuted text-sm mt-0.5">Départements de la Faculté des Sciences</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={id => window.confirm('Supprimer ?') && remove(id)}
        emptyText="Aucun département enregistré." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier le département' : 'Nouveau département'}
        onConfirm={handleSave} loading={saving}>
        <F label="Code (ex : TIC, BCH)">
          <input className={iCls} value={form.code} placeholder="TIC"
            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </F>
        <F label="Nom complet">
          <input className={iCls} value={form.nom} placeholder="Technologies de l'Information…"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
      </Modal>
    </div>
  );
}
