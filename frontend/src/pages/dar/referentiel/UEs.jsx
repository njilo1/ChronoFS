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

const BLANK = { code: '', intitule: '', filiere: '' };
const COLS = [
  { key: 'code',     label: 'Code' },
  { key: 'intitule', label: 'Intitulé' },
  { key: 'filiere',  label: 'Filière', render: r => r.filiere ? `${r.filiere.code ?? ''} ${r.filiere.niveau ?? ''}`.trim() : '—' },
];

export default function UEs() {
  const { data, loading, create, update, remove } = useCrud('ues');
  const [filieres, setFilieres] = useState([]);
  const [modal, setModal]       = useState({ open: false, item: null });
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/filieres/').then(r => setFilieres(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => {
    setForm({ ...BLANK, filiere: filieres[0]?.id ?? '' });
    setModal({ open: true, item: null });
  };
  const openEdit = (item) => {
    setForm({ code: item.code, intitule: item.intitule, filiere: item.filiere?.id ?? item.filiere });
    setModal({ open: true, item });
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };

  const filtered = data.filter(u =>
    !search ||
    u.code?.toLowerCase().includes(search.toLowerCase()) ||
    u.intitule?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Unités d'Enseignement</h1>
          <p className="text-emuted text-sm mt-0.5">UEs du référentiel pédagogique</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <input
        className="w-full max-w-xs bg-ecard border border-eborder rounded-lg px-3 py-2 text-sm text-etext placeholder:text-emuted/50 focus:outline-none focus:border-gold/50 transition-all"
        placeholder="Rechercher une UE…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={id => window.confirm('Supprimer cette UE ?') && remove(id)}
        emptyText="Aucune UE trouvée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier l\'UE' : 'Nouvelle UE'}
        onConfirm={handleSave} loading={saving}>
        <F label="Code (ex : INF3101)">
          <input className={iCls} value={form.code} placeholder="INF3101"
            onChange={e => setForm({ ...form, code: e.target.value })} />
        </F>
        <F label="Intitulé">
          <input className={iCls} value={form.intitule} placeholder="Algorithmique avancée"
            onChange={e => setForm({ ...form, intitule: e.target.value })} />
        </F>
        <F label="Filière">
          <select className={iCls} value={form.filiere}
            onChange={e => setForm({ ...form, filiere: e.target.value })}>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.code} {f.niveau} — {f.nom}</option>
            ))}
          </select>
        </F>
      </Modal>
    </div>
  );
}
