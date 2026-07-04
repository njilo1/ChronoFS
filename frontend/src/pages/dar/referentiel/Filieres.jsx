import { useState, useEffect } from 'react';
import { Plus, GraduationCap } from 'lucide-react';
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

const NIVEAUX = ['L1','L2','L3','M1','M2'];
const NIVEAU_COLORS = {
  L1: 'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60',
  L2: 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900/40 dark:text-primary-200 dark:border-primary-700',
  L3: 'bg-primary-700 text-white border-primary-700 dark:bg-gold-500 dark:text-page-dark dark:border-gold-500',
  M1: 'bg-gold-100 text-gold-700 border-gold-200 dark:bg-gold-500/15 dark:text-gold-300 dark:border-gold-500/30',
  M2: 'bg-gold-200 text-gold-700 border-gold-300 dark:bg-gold-500/25 dark:text-gold-300 dark:border-gold-500/40',
};
const BLANK = { nom: '', code: '', departement: '', niveau: 'L1', ville: 'EBOLOWA', effectif: '' };

const COLS = [
  { key: 'code', label: 'Code', render: r => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-surface-alt dark:bg-surface-dark-alt text-ink dark:text-ink-dark border border-line dark:border-line-dark">{r.code}</span>
  )},
  { key: 'nom', label: 'Filière' },
  { key: 'niveau', label: 'Niveau', render: r => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${NIVEAU_COLORS[r.niveau] ?? 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark'}`}>
      {r.niveau}
    </span>
  )},
  { key: 'ville', label: 'Ville', render: r => (
    <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.ville === 'EBOLOWA' ? 'Ébolowa' : 'Monatélé'}</span>
  )},
  { key: 'effectif', label: 'Effectif', render: r => (
    <span className="font-semibold text-ink-strong dark:text-ink-dark-strong">{r.effectif ?? 0} <span className="text-ink-subtle font-normal text-xs">étudiants</span></span>
  )},
  { key: 'departement', label: 'Département', render: r => (
    <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.departement?.code ?? '—'}</span>
  )},
];

export default function Filieres() {
  const { data, loading, create, update, remove } = useCrud('filieres', { nom: 'Filière', genre: 'f' });
  const [deps, setDeps]   = useState([]);
  const [modal, setModal] = useState({ open: false, item: null });
  const [form, setForm]   = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/departements/').then(r => setDeps(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => { setForm({ ...BLANK, departement: deps[0]?.id ?? '' }); setModal({ open: true, item: null }); };
  const openEdit = (item) => {
    setForm({ nom: item.nom, code: item.code, niveau: item.niveau, ville: item.ville, effectif: item.effectif, departement: item.departement?.id ?? item.departement });
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
    const ok = await askConfirm({
      title: 'Supprimer cette filière ?',
      description: 'Les UE et imports rattachés seront également supprimés.',
    });
    if (ok) remove(id);
  };

  const filtered = data.filter(f =>
    !search ||
    f.code?.toLowerCase().includes(search.toLowerCase()) ||
    f.nom?.toLowerCase().includes(search.toLowerCase()) ||
    f.niveau?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      icon={GraduationCap}
      gradient="from-primary-700 to-primary-500"
      title="Filières"
      subtitle="Classes pédagogiques par niveau et site"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <input
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par code, nom ou niveau…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        emptyText="Aucune filière trouvée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier la filière' : 'Nouvelle filière'}
        onConfirm={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Code (ex : TIC)">
            <input className={iCls} value={form.code} placeholder="TIC"
              onChange={e => setForm({ ...form, code: e.target.value })} />
          </F>
          <F label="Niveau">
            <select className={iCls} value={form.niveau}
              onChange={e => setForm({ ...form, niveau: e.target.value })}>
              {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </F>
        </div>
        <F label="Nom de la filière">
          <input className={iCls} value={form.nom} placeholder="Technologies de l'Information…"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Département">
            <select className={iCls} value={form.departement}
              onChange={e => setForm({ ...form, departement: e.target.value })}>
              {deps.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
            </select>
          </F>
          <F label="Ville">
            <select className={iCls} value={form.ville}
              onChange={e => setForm({ ...form, ville: e.target.value })}>
              <option value="EBOLOWA">Ébolowa</option>
              <option value="MONATELE">Monatélé</option>
            </select>
          </F>
        </div>
        <F label="Effectif (étudiants)">
          <input type="number" className={iCls} value={form.effectif} min={0}
            onChange={e => setForm({ ...form, effectif: e.target.value })} />
        </F>
      </Modal>
    </PageShell>
  );
}
