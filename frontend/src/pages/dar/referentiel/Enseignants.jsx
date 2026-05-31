import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
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

const GRADES = ['DR','PR','M','MME','ING'];
const GRADE_LABELS = { DR: 'Dr', PR: 'Pr', M: 'M.', MME: 'Mme', ING: 'Ing.' };
const STATUTS = ['PERMANENT', 'VACATAIRE'];
const STATUT_LABELS = { PERMANENT: 'Permanent', VACATAIRE: 'Vacataire' };
const BLANK = { nom: '', grade: 'DR', statut: 'PERMANENT', matricule: '', departements: [], actif: true };

const COLS = [
  { key: 'grade', label: 'Grade', render: r => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface-alt text-ink-muted border border-line">
      {GRADE_LABELS[r.grade] ?? r.grade}
    </span>
  )},
  { key: 'nom', label: 'Nom complet', render: r => <span className="font-semibold text-ink-strong dark:text-ink-dark-strong">{r.nom}</span> },
  { key: 'identifiant', label: 'Identifiant', render: r => (
    r.matricule
      ? <span className="font-mono text-[12px] font-semibold text-ink-strong dark:text-ink-dark-strong">{r.matricule}</span>
      : <span className="font-mono text-[11px] text-ink-subtle italic" title="Référence interne (pas de matricule officiel)">{r.identifiant ?? '—'}</span>
  )},
  { key: 'statut', label: 'Type', render: r => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${r.statut === 'VACATAIRE' ? 'bg-gold-100 text-gold-700 border-gold-200' : 'bg-surface-alt text-ink-muted border-line'}`}>
      {STATUT_LABELS[r.statut] ?? r.statut ?? 'Permanent'}
    </span>
  )},
  { key: 'departements', label: 'Départements', render: r => (
    <div className="flex items-center gap-1 flex-wrap">
      {(r.departements ?? []).length > 0
        ? (r.departements ?? []).map(d => (
            <span key={d.id ?? d} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 text-primary-700 border border-primary-200">
              {d.code ?? d}
            </span>
          ))
        : <span className="text-ink-subtle text-xs">—</span>
      }
    </div>
  )},
  { key: 'actif', label: 'Statut', render: r => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${r.actif ? 'bg-success/10 text-success border-success/25 dark:bg-success/20 dark:text-emerald-300 dark:border-success/30' : 'bg-danger/10 text-danger border-danger/25 dark:bg-danger/20 dark:text-red-300 dark:border-danger/30'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.actif ? 'bg-success' : 'bg-danger'}`} />
      {r.actif ? 'Actif' : 'Désactivé'}
    </span>
  )},
];

export default function Enseignants() {
  const { data, loading, create, update, patch, remove } = useCrud('enseignants', { nom: 'Enseignant', genre: 'm' });
  const [deps, setDeps]     = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/departements/').then(r => setDeps(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ nom: item.nom, grade: item.grade, statut: item.statut ?? 'PERMANENT', matricule: item.matricule ?? '', departements: (item.departements ?? []).map(d => d.id ?? d), actif: item.actif });
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
      // Un vacataire n'a pas de matricule : on n'envoie le champ que pour un permanent.
      const payload = { ...form, matricule: form.statut === 'PERMANENT' ? (form.matricule || '').trim() : '' };
      modal.item ? await update(modal.item.id, payload) : await create(payload);
      setModal({ open: false, item: null });
    } catch {
      /* toast d'erreur déjà affiché par useCrud ; on garde la modale ouverte */
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await askConfirm({
      title: 'Supprimer cet enseignant ?',
      description: 'Cette action est définitive.',
    });
    if (ok) remove(id);
  };

  const filtered = data.filter(e =>
    !search ||
    e.nom?.toLowerCase().includes(search.toLowerCase()) ||
    (e.departements ?? []).some(d => (d.code ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageShell
      icon={Users}
      gradient="from-primary-800 to-primary-600"
      title="Enseignants"
      subtitle="Corps enseignant de la FS-UEB"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <input
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par nom ou département…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        onToggle={e => patch(e.id, { actif: !e.actif })} toggleField="actif"
        emptyText="Aucun enseignant enregistré." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? "Modifier l'enseignant" : 'Nouvel enseignant'}
        onConfirm={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Grade">
            <select className={iCls} value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value })}>
              {GRADES.map(g => <option key={g} value={g}>{GRADE_LABELS[g]} ({g})</option>)}
            </select>
          </F>
          <F label="Statut">
            <select className={iCls} value={form.statut}
              onChange={e => setForm({ ...form, statut: e.target.value })}>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </F>
        </div>
        <F label="Nom complet">
          <input className={iCls} value={form.nom} placeholder="Nom de l'enseignant"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
        {form.statut === 'PERMANENT' ? (
          <F label="Matricule">
            <input className={`${iCls} font-mono`} value={form.matricule}
              placeholder="0777888A — 7 chiffres + 1 lettre"
              maxLength={8}
              onChange={e => setForm({ ...form, matricule: e.target.value.toUpperCase() })} />
          </F>
        ) : (
          <div className="text-[12px] text-ink-muted bg-surface-subtle border border-line rounded-xl px-3 py-2.5 leading-relaxed">
            Les vacataires n'ont pas de matricule officiel : un identifiant interne
            (ex. <span className="font-mono font-semibold">VAC-0007</span>) leur est attribué automatiquement.
          </div>
        )}
        <F label="Départements">
          <div className="grid grid-cols-2 gap-1.5 p-3 bg-surface-subtle rounded-xl border border-line max-h-36 overflow-y-auto">
            {deps.map(d => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer hover:text-primary-700 transition-colors">
                <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary-700"
                  checked={form.departements.includes(d.id)}
                  onChange={() => toggleDep(d.id)} />
                <span className="truncate"><strong>{d.code}</strong> {d.nom}</span>
              </label>
            ))}
          </div>
        </F>
      </Modal>
    </PageShell>
  );
}
