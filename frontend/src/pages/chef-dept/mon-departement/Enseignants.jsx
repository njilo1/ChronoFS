import { useState } from 'react';
import { Plus, Users, CalendarOff } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import { askConfirm } from '../../../store/confirmStore';
import PageShell from '../../../components/ui/PageShell';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import AbsenceModal from '../../../components/ui/AbsenceModal';

const iCls = 'input-field';
function F({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const GRADES = ['DR', 'PR', 'M', 'MME', 'ING'];
const GRADE_LABELS = { DR: 'Dr', PR: 'Pr', M: 'M.', MME: 'Mme', ING: 'Ing.' };
const STATUTS = ['PERMANENT', 'VACATAIRE'];
const STATUT_LABELS = { PERMANENT: 'Permanent', VACATAIRE: 'Vacataire' };
const BLANK = { nom: '', grade: 'DR', statut: 'PERMANENT', matricule: '' };

const COLS = [
  { key: 'grade', label: 'Grade', render: r => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface-alt text-ink-muted border border-line">
      {GRADE_LABELS[r.grade] ?? r.grade ?? '—'}
    </span>
  )},
  { key: 'nom', label: 'Nom complet', render: r => <span className="font-semibold">{r.nom}</span> },
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
];

export default function ChefEnseignants() {
  const { data, loading, create, update, remove } = useCrud('mon-departement/enseignants', { nom: 'Enseignant', genre: 'm' });
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [absenceFor, setAbsenceFor] = useState(null);

  // Colonne « Absences » : ouvre la modale de gestion des absences ponctuelles.
  const cols = [
    ...COLS,
    { key: 'absences', label: 'Absences', render: r => (
      <button onClick={() => setAbsenceFor(r)} title="Signaler / gérer les absences"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 dark:text-primary-300 hover:underline">
        <CalendarOff size={13} /> Signaler
      </button>
    )},
  ];

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ nom: item.nom, grade: item.grade, statut: item.statut ?? 'PERMANENT', matricule: item.matricule ?? '' });
    setModal({ open: true, item });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Un vacataire n'a pas de matricule : on ne l'envoie que pour un permanent.
      const payload = { ...form, matricule: form.statut === 'PERMANENT' ? (form.matricule || '').trim() : '' };
      modal.item ? await update(modal.item.id, payload) : await create(payload);
      setModal({ open: false, item: null });
    } catch {
      /* message d'erreur déjà affiché en toast par useCrud */
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await askConfirm({
      title: 'Retirer cet enseignant ?',
      description: 'Il sera retiré de votre département.',
      confirmLabel: 'Retirer',
    });
    if (ok) remove(id);
  };

  const filtered = data.filter(e =>
    !search ||
    e.nom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      icon={Users}
      title="Mes Enseignants"
      subtitle="Enseignants rattachés à votre département"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <input
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par nom…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={cols} data={filtered} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        emptyText="Aucun enseignant. Cliquez sur « Ajouter » pour en créer un." />

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
        <p className="text-xs text-ink-subtle">
          L'enseignant sera automatiquement rattaché à votre département.
        </p>
      </Modal>

      <AbsenceModal
        open={!!absenceFor}
        onClose={() => setAbsenceFor(null)}
        enseignant={absenceFor}
      />
    </PageShell>
  );
}
