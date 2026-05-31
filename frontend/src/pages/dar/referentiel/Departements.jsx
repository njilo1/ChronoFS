import { useState, useEffect } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import { askConfirm } from '../../../store/confirmStore';
import { toast } from '../../../store/toastStore';
import api from '../../../services/api';
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

const BLANK = { nom: '', code: '', chef: '' };

// Libellé lisible d'un compte chef pour la liste déroulante.
const labelChef = (c) =>
  `${c.grade_display ?? c.grade ?? ''} ${c.last_name || c.first_name || c.username}`.trim();

const COLS = [
  { key: 'code', label: 'Code', render: r => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200">
      {r.code}
    </span>
  )},
  { key: 'nom', label: 'Département' },
  { key: 'chef_nom', label: 'Chef de département', render: r => (
    r.chef_nom
      ? <span className="font-semibold text-ink-strong dark:text-ink-dark-strong">{r.chef_nom}</span>
      : <span className="text-ink-subtle text-xs italic">Aucun chef désigné</span>
  )},
];

export default function Departements() {
  const { data, loading, create, update, remove, refetch } = useCrud('departements', { nom: 'Département', genre: 'm' });
  const [chefs, setChefs]   = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  // Comptes chefs disponibles pour la liste déroulante.
  useEffect(() => {
    api.get('/chefs-departement/')
      .then(r => setChefs(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
      .catch(() => setChefs([]));
  }, []);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ nom: item.nom, code: item.code, chef: item.chef_id ?? '' });
    setModal({ open: true, item });
  };

  const handleSave = async () => {
    setSaving(true);
    const { chef, ...deptData } = form;

    // 1. Enregistrer le département (code + nom). useCrud gère ses propres
    //    toasts d'erreur ; en cas d'échec on garde la modale ouverte.
    let deptId;
    try {
      const res = modal.item ? await update(modal.item.id, deptData) : await create(deptData);
      deptId = modal.item ? modal.item.id : res?.data?.id;
    } catch {
      setSaving(false);
      return;
    }

    // 2. Réconcilier le chef (compte User rattaché au département) si la
    //    sélection a changé.
    try {
      const ancien = modal.item?.chef_id ?? '';
      if (deptId && String(chef) !== String(ancien)) {
        // On libère d'abord l'ancien chef de CE département, puis on rattache
        // le nouveau → le département a toujours exactement un chef.
        if (ancien) await api.patch(`/chefs-departement/${ancien}/`, { departement: null });
        if (chef)   await api.patch(`/chefs-departement/${chef}/`,   { departement: deptId });
        await refetch();  // rafraîchit la colonne « Chef »
      }
    } catch {
      toast.error("Département enregistré, mais l'affectation du chef a échoué.");
    }

    setModal({ open: false, item: null });
    setSaving(false);
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
        <F label="Chef de département">
          <select className={iCls} value={form.chef}
            onChange={e => setForm({ ...form, chef: e.target.value })}>
            <option value="">— Aucun chef —</option>
            {chefs.map(c => {
              // c.departement = id du département actuel du chef (ou null).
              const dejaAilleurs = c.departement && (!modal.item || c.departement !== modal.item.id);
              return (
                <option key={c.id} value={c.id}>
                  {labelChef(c)}{dejaAilleurs ? ` (actuellement ${c.departement_nom})` : ''}
                </option>
              );
            })}
          </select>
          {chefs.length === 0 && (
            <p className="text-[11px] text-ink-subtle mt-1.5">
              Aucun compte chef existant — créez-en un depuis la page « Chefs de département ».
            </p>
          )}
        </F>
      </Modal>
    </PageShell>
  );
}
