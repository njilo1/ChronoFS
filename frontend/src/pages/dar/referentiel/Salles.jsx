import { useState, useEffect } from 'react';
import { Plus, DoorOpen } from 'lucide-react';
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
      <label className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const TYPE_SALLE = ['COURS','TP','MULTIMEDIA','AMPHI','TERRAIN','LABO','BUREAU'];
const TYPE_COLORS = {
  COURS: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60',
  TP:    'bg-gold-100 text-gold-700 border-gold-200 dark:bg-gold-500/15 dark:text-gold-300 dark:border-gold-500/30',
  AMPHI: 'bg-success/10 text-success border-success/25 dark:bg-success/20 dark:text-emerald-300 dark:border-success/30',
  LABO:  'bg-warning/10 text-warning border-warning/25 dark:bg-warning/20 dark:text-amber-300 dark:border-warning/30',
};
const BLANK = { nom: '', campus: '', capacite: '', type_salle: 'COURS', disponible: true };

const COLS = [
  { key: 'nom', label: 'Salle' },
  { key: 'campus', label: 'Campus', render: r => (
    <span className="text-ink-muted dark:text-ink-dark-muted text-xs">{r.campus?.nom ?? '—'}</span>
  )},
  { key: 'capacite', label: 'Capacité', render: r => (
    <span className="font-semibold text-ink-strong dark:text-ink-dark-strong">{r.capacite ?? 0} <span className="text-ink-subtle font-normal text-xs">places</span></span>
  )},
  { key: 'type_salle', label: 'Type', render: r => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${TYPE_COLORS[r.type_salle] ?? 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark'}`}>
      {r.type_salle}
    </span>
  )},
  { key: 'disponible', label: 'Statut', render: r => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${r.disponible ? 'bg-success/10 text-success border-success/25 dark:bg-success/20 dark:text-emerald-300 dark:border-success/30' : 'bg-danger/10 text-danger border-danger/25 dark:bg-danger/20 dark:text-red-300 dark:border-danger/30'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.disponible ? 'bg-success' : 'bg-danger'}`} />
      {r.disponible ? 'Disponible' : 'Indisponible'}
    </span>
  )},
];

export default function Salles() {
  const { data, loading, create, update, patch, remove } = useCrud('salles', { nom: 'Salle', genre: 'f' });
  const [campus, setCampus] = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/campus/').then(r => setCampus(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => { setForm({ ...BLANK, campus: campus[0]?.id ?? '' }); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ nom: item.nom, campus: item.campus?.id ?? item.campus, capacite: item.capacite, type_salle: item.type_salle, disponible: item.disponible });
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
    const ok = await askConfirm({ title: 'Supprimer cette salle ?' });
    if (ok) remove(id);
  };

  const filtered = data.filter(s =>
    !search ||
    s.nom?.toLowerCase().includes(search.toLowerCase()) ||
    s.campus?.nom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      icon={DoorOpen}
      gradient="from-primary-800 to-primary-600"
      title="Salles"
      subtitle="Salles d'enseignement de la FS-UEB"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <input
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par nom ou campus…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        onToggle={s => patch(s.id, { disponible: !s.disponible })} toggleField="disponible"
        emptyText="Aucune salle trouvée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier la salle' : 'Nouvelle salle'}
        onConfirm={handleSave} loading={saving}>
        <F label="Nom de la salle">
          <input className={iCls} value={form.nom} placeholder="ex : Salle A"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
        <F label="Campus">
          <select className={iCls} value={form.campus}
            onChange={e => setForm({ ...form, campus: e.target.value })}>
            {campus.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Capacité (places)">
            <input type="number" className={iCls} value={form.capacite} min={1}
              onChange={e => setForm({ ...form, capacite: e.target.value })} />
          </F>
          <F label="Type de salle">
            <select className={iCls} value={form.type_salle}
              onChange={e => setForm({ ...form, type_salle: e.target.value })}>
              {TYPE_SALLE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.disponible}
            onChange={e => setForm({ ...form, disponible: e.target.checked })}
            className="w-4 h-4 rounded border-line accent-primary-700" />
          <span className="text-sm font-medium text-ink">Salle disponible</span>
        </label>
      </Modal>
    </PageShell>
  );
}
