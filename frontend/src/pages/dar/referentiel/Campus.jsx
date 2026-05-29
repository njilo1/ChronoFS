import { useState } from 'react';
import { Plus, MapPin } from 'lucide-react';

import { useCrud } from '../../../hooks/useCrud';
import { askConfirm } from '../../../store/confirmStore';
import PageShell from '../../../components/ui/PageShell';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const iCls = 'input-field';
function F({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const BLANK = { nom: '', ville: 'EBOLOWA' };

const COLS = [
  { key: 'nom',   label: 'Nom du campus', render: r => (
    <span className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
      {r.nom}
    </span>
  )},
  { key: 'ville', label: 'Ville', render: r => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${r.ville === 'EBOLOWA' ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60' : 'bg-gold-100 text-gold-700 border-gold-200 dark:bg-gold-500/15 dark:text-gold-300 dark:border-gold-500/30'}`}>
      {r.ville === 'EBOLOWA' ? 'Ébolowa' : 'Monatélé'}
    </span>
  )},
];

export default function Campus() {
  const { data, loading, create, update, remove } = useCrud('campus', { nom: 'Campus', genre: 'm' });
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => { setForm({ nom: item.nom, ville: item.ville }); setModal({ open: true, item }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } catch {
      /* toast d'erreur déjà affiché par useCrud */
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await askConfirm({
      title: 'Supprimer ce campus ?',
      description: 'Les salles rattachées seront également supprimées.',
    });
    if (ok) remove(id);
  };

  return (
    <PageShell
      icon={MapPin}
      title="Campus"
      subtitle="Sites physiques de la FS-UEB"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
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
    </PageShell>
  );
}
