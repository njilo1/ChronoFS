import { useState, useEffect } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import { askConfirm } from '../../../store/confirmStore';
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

const BLANK = { code: '', intitule: '', filiere: '' };

const COLS = [
  { key: 'code', label: 'Code', render: r => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-primary-50 text-primary-800 border border-primary-200 font-mono tracking-wide">
      {r.code}
    </span>
  )},
  { key: 'intitule', label: 'Intitulé' },
  { key: 'filiere', label: 'Filière', render: r => r.filiere ? (
    <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
      <strong>{r.filiere.code ?? ''}</strong>
      {r.filiere.niveau ? ` · ${r.filiere.niveau}` : ''}
    </span>
  ) : '—' },
];

export default function UEs() {
  const { data, loading, create, update, remove } = useCrud('ues', { nom: 'UE', genre: 'f' });
  const [filieres, setFilieres] = useState([]);
  const [modal, setModal]       = useState({ open: false, item: null });
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/filieres/').then(r => setFilieres(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => { setForm({ ...BLANK, filiere: filieres[0]?.id ?? '' }); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ code: item.code, intitule: item.intitule, filiere: item.filiere?.id ?? item.filiere });
    setModal({ open: true, item });
  };
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
    const ok = await askConfirm({ title: 'Supprimer cette UE ?' });
    if (ok) remove(id);
  };

  const filtered = data.filter(u =>
    !search ||
    u.code?.toLowerCase().includes(search.toLowerCase()) ||
    u.intitule?.toLowerCase().includes(search.toLowerCase()) ||
    u.filiere?.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      icon={BookOpen}
      gradient="from-primary-800 to-primary-700"
      title="Unités d'Enseignement"
      subtitle="Référentiel pédagogique des UEs"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <input
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par code, intitulé ou filière…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        emptyText="Aucune UE trouvée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? "Modifier l'UE" : 'Nouvelle UE'}
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
    </PageShell>
  );
}
