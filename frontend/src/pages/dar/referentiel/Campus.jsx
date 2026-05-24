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

const BLANK = { nom: '', ville: 'EBOLOWA' };
const COLS = [
  { key: 'nom',   label: 'Nom' },
  { key: 'ville', label: 'Ville', render: r => r.ville === 'EBOLOWA' ? 'Ébolowa' : 'Monatélé' },
];

export default function Campus() {
  const { data, loading, create, update, remove } = useCrud('campus');
  const [modal, setModal] = useState({ open: false, item: null });
  const [form, setForm]   = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => { setForm({ nom: item.nom, ville: item.ville }); setModal({ open: true, item }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce campus ?')) await remove(id);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Campus</h1>
          <p className="text-emuted text-sm mt-0.5">Sites physiques de la FS-UEB</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        emptyText="Aucun campus enregistré." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier le campus' : 'Nouveau campus'}
        onConfirm={handleSave} loading={saving}>
        <F label="Nom du campus">
          <input className={iCls} value={form.nom} placeholder="ex : Campus Principal FS"
            onChange={e => setForm({ ...form, nom: e.target.value })} required />
        </F>
        <F label="Ville">
          <select className={iCls} value={form.ville}
            onChange={e => setForm({ ...form, ville: e.target.value })}>
            <option value="EBOLOWA">Ébolowa</option>
            <option value="MONATELE">Monatélé</option>
          </select>
        </F>
      </Modal>
    </div>
  );
}
