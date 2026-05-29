import { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
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

const BLANK = { nom: '', code: '' };

const COLS = [
  { key: 'code', label: 'Code', render: r => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200">
      {r.code}
    </span>
  )},
  { key: 'nom', label: 'Département' },
];

export default function Departements() {
  const { data, loading, create, update, remove } = useCrud('departements', { nom: 'Département', genre: 'm' });
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => { setForm({ nom: item.nom, code: item.code }); setModal({ open: true, item }); };

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
      title: 'Supprimer ce département ?',
      description: 'Les filières, UE et imports rattachés seront également supprimés.',
    });
    if (ok) remove(id);
  };

  return (
    <PageShell
      icon={Building2}
      title="Départements"
      subtitle="Départements de la Faculté des Sciences"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
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
    </PageShell>
  );
}
