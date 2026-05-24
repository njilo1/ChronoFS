import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import api from '../../../services/api';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const iCls = 'w-full bg-ebg border border-eborder rounded-lg px-3 py-2 text-sm text-etext focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all';
function F({ label, children }) {
  return <div><label className="text-emuted text-xs mb-1 block">{label}</label>{children}</div>;
}

const GRADES = ['DR','PR','M','MME','ING'];
const BLANK  = { nom: '', grade: 'DR', departements: [] };
const COLS = [
  { key: 'grade', label: 'Grade' },
  { key: 'nom',   label: 'Nom' },
  { key: 'departements', label: 'Départements',
    render: r => (r.departements ?? []).map(d => d.code ?? d).join(', ') || '—' },
];

export default function Enseignants() {
  const { data, loading, create, update, remove } = useCrud('enseignants');
  const [deps, setDeps] = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/departements/').then(r => setDeps(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({
      nom: item.nom, grade: item.grade,
      departements: (item.departements ?? []).map(d => d.id ?? d),
    });
    setModal({ open: true, item });
  };

  const toggleDep = (id) => {
    setForm(f => ({
      ...f,
      departements: f.departements.includes(id)
        ? f.departements.filter(x => x !== id)
        : [...f.departements, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Enseignants</h1>
          <p className="text-emuted text-sm mt-0.5">Corps enseignant de la FS-UEB</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={id => window.confirm('Supprimer cet enseignant ?') && remove(id)}
        emptyText="Aucun enseignant enregistré." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier l\'enseignant' : 'Nouvel enseignant'}
        onConfirm={handleSave} loading={saving}>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <F label="Grade">
              <select className={iCls} value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value })}>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </F>
          </div>
          <div className="col-span-2">
            <F label="Nom complet">
              <input className={iCls} value={form.nom} placeholder="Nom de l'enseignant"
                onChange={e => setForm({ ...form, nom: e.target.value })} />
            </F>
          </div>
        </div>
        <F label="Départements (cocher tous ceux concernés)">
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {deps.map(d => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-etext cursor-pointer hover:text-gold transition-colors">
                <input type="checkbox" className="accent-gold"
                  checked={form.departements.includes(d.id)}
                  onChange={() => toggleDep(d.id)} />
                {d.code} — {d.nom}
              </label>
            ))}
          </div>
        </F>
      </Modal>
    </div>
  );
}
