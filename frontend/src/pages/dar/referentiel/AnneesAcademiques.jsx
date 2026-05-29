import { useState } from 'react';
import { Plus, CalendarDays, CheckCircle } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import { askConfirm } from '../../../store/confirmStore';
import { toast } from '../../../store/toastStore';
import { extractApiError } from '../../../services/apiError';
import PageShell from '../../../components/ui/PageShell';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import api from '../../../services/api';

const iCls = 'input-field';
function F({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const BLANK = { libelle: '', date_debut: '', date_fin: '', active: false };

export default function AnneesAcademiques() {
  const { data, loading, create, update, remove, refetch } = useCrud('annees-academiques', { nom: 'Année académique', genre: 'f' });
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy]     = useState(null);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({ libelle: item.libelle ?? '', date_debut: item.date_debut ?? '', date_fin: item.date_fin ?? '', active: item.active ?? false });
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
  const handleActivate = async (id) => {
    setBusy(id);
    try {
      await api.post(`/annees-academiques/${id}/activer/`);
      await refetch();
      toast.success('Année académique activée.');
    } catch (e) {
      toast.error(extractApiError(e));
    } finally { setBusy(null); }
  };
  const handleDelete = async (id) => {
    const ok = await askConfirm({ title: 'Supprimer cette année académique ?' });
    if (ok) remove(id);
  };

  const COLS = [
    { key: 'libelle', label: 'Année académique', render: r => (
      <span className="font-bold text-ink-strong dark:text-ink-dark-strong">{r.libelle}</span>
    )},
    { key: 'date_debut', label: 'Début', render: r => <span className="text-ink-muted dark:text-ink-dark-muted text-xs">{fmt(r.date_debut)}</span> },
    { key: 'date_fin',   label: 'Fin',   render: r => <span className="text-ink-muted dark:text-ink-dark-muted text-xs">{fmt(r.date_fin)}</span> },
    { key: 'active', label: 'Statut', render: r => r.active ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border font-semibold bg-success/10 text-success border-success/25 dark:bg-success/20 dark:text-emerald-300 dark:border-success/30">
        <CheckCircle size={10} /> Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border font-semibold bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark">
        Inactive
      </span>
    )},
    { key: '_act', label: '', render: r => !r.active && (
      <button onClick={() => handleActivate(r.id)} disabled={busy === r.id}
        className="px-3 py-1 text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors disabled:opacity-50">
        {busy === r.id ? '…' : 'Activer'}
      </button>
    )},
  ];

  return (
    <PageShell
      icon={CalendarDays}
      gradient="from-primary-900 to-primary-700"
      title="Années académiques"
      subtitle="Périodes académiques et année active"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter</Button>}
    >
      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={handleDelete}
        emptyText="Aucune année académique enregistrée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? "Modifier l'année" : 'Nouvelle année académique'}
        onConfirm={handleSave} loading={saving}>
        <F label="Libellé (ex : 2025-2026)">
          <input className={iCls} value={form.libelle} placeholder="2025-2026"
            onChange={e => setForm({ ...form, libelle: e.target.value })} required />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Date de début">
            <input type="date" className={iCls} value={form.date_debut}
              onChange={e => setForm({ ...form, date_debut: e.target.value })} />
          </F>
          <F label="Date de fin">
            <input type="date" className={iCls} value={form.date_fin}
              onChange={e => setForm({ ...form, date_fin: e.target.value })} />
          </F>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.active}
            onChange={e => setForm({ ...form, active: e.target.checked })}
            className="w-4 h-4 rounded border-line accent-primary-700" />
          <span className="text-sm font-medium text-ink">Définir comme année active</span>
        </label>
      </Modal>
    </PageShell>
  );
}
