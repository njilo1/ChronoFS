import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Lock, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import { useCrud } from '../../hooks/useCrud';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import PageShell from '../../components/ui/PageShell';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../services/api';

const iCls = 'input-field';
function F({ label, children, hint }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-subtle dark:text-ink-dark-subtle mt-1">{hint}</p>}
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    dure:    'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
    souple:  'bg-info/10 text-info border-info/25 dark:text-sky-300 dark:border-info/30',
    statique: 'bg-gold-50 text-gold-800 border-gold-200 dark:bg-gold-500/10 dark:text-gold-300 dark:border-gold-500/30',
    dynamique: 'bg-success/10 text-success border-success/25 dark:text-emerald-300 dark:border-success/30',
    neutral: 'bg-surface-alt text-ink-muted border-line dark:bg-surface-dark-alt dark:text-ink-dark-muted dark:border-line-dark',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${tones[tone]}`}>{children}</span>;
}

export default function Contraintes() {
  const { data, loading, refetch } = useCrud('regles-solver', { nom: 'Règle', genre: 'f' });
  const [templates, setTemplates] = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState({ nom: '', description: '', template: '', parametres: {} });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false });
  const [busy, setBusy]     = useState(null);

  useEffect(() => {
    api.get('/regles-solver/templates/')
      .then(r => setTemplates(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const specForTemplate = (t) => templates.find(x => x.template === t);

  const openCreate = () => {
    setForm({ nom: '', description: '', template: '', parametres: {} });
    setModal({ open: true, item: null });
  };
  const openEdit = (row) => {
    setForm({
      nom: row.nom ?? '',
      description: row.description ?? '',
      template: row.template ?? '',
      parametres: { ...(row.parametres ?? {}) },
    });
    setModal({ open: true, item: row });
  };

  const onSelectTemplate = (t) => {
    const spec = specForTemplate(t);
    const params = {};
    (spec?.champs ?? []).forEach(c => { if (c.defaut !== undefined) params[c.nom] = c.defaut; });
    setForm(f => ({ ...f, template: t, nom: f.nom || spec?.label || '', parametres: params }));
  };

  const setParam = (nom, val) => setForm(f => ({ ...f, parametres: { ...f.parametres, [nom]: val } }));

  const handleSave = async () => {
    if (!form.template) { toast.error('Choisissez un type de règle.'); return; }
    setSaving(true);
    try {
      const payload = { nom: form.nom, description: form.description, parametres: form.parametres };
      if (modal.item) {
        // Édition : le template ne change pas, on met à jour nom/description/paramètres.
        await api.patch(`/regles-solver/${modal.item.id}/`, payload);
        toast.success('Règle mise à jour.');
      } else {
        await api.post('/regles-solver/', { ...payload, template: form.template });
        toast.success('Règle dynamique créée.');
      }
      await refetch();
      setModal({ open: false, item: null });
    } catch (err) {
      toast.error(extractApiError(err));
    } finally { setSaving(false); }
  };

  const toggleDefaut = async (row) => {
    setBusy(`t-${row.id}`);
    try {
      await api.patch(`/regles-solver/${row.id}/`, { active_par_defaut: !row.active_par_defaut });
      await refetch();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(null); }
  };

  const askDelete = (row) => setConfirm({
    open: true, id: row.id, label: 'Supprimer',
    desc: `La règle « ${row.nom} » sera supprimée. Les générations futures ne l'appliqueront plus.`,
  });
  const execDelete = async () => {
    const { id } = confirm; setConfirm({ open: false }); setBusy(`d-${id}`);
    try { await api.delete(`/regles-solver/${id}/`); await refetch(); toast.success('Règle supprimée.'); }
    catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(null); }
  };

  const COLS = [
    { key: 'code', label: 'Code', render: r => (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink-strong dark:text-ink-dark-strong">
        {r.verrouillee && <Lock size={11} className="text-gold-600 dark:text-gold-400" />}
        {r.code}
      </span>
    )},
    { key: 'nom', label: 'Règle', render: r => (
      <div className="max-w-md">
        <p className="font-semibold text-ink dark:text-ink-dark">{r.nom}</p>
        {r.description && <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-0.5 leading-snug">{r.description}</p>}
      </div>
    )},
    { key: 'type_regle', label: 'Type', render: r => (
      <Pill tone={r.type_regle === 'DURE' ? 'dure' : 'souple'}>{r.type_regle_display ?? r.type_regle}</Pill>
    )},
    { key: 'categorie', label: 'Catégorie', render: r => (
      <Pill tone={r.categorie === 'STATIQUE' ? 'statique' : 'dynamique'}>{r.categorie_display ?? r.categorie}</Pill>
    )},
    { key: 'active_par_defaut', label: 'Cochée par défaut', render: r => (
      <button
        onClick={() => toggleDefaut(r)} disabled={busy === `t-${r.id}`}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.active_par_defaut ? 'bg-primary-900 dark:bg-gold-500' : 'bg-line-strong dark:bg-line-dark-strong'} disabled:opacity-40`}
        title="La case est cochée par défaut dans la modale de génération du DAR"
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${r.active_par_defaut ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
    )},
    { key: '_act', label: 'Actions', render: r => (
      <div className="flex items-center justify-end gap-1">
        {r.verrouillee ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-subtle dark:text-ink-dark-subtle px-1.5" title="Règle fondatrice verrouillée">
            <Lock size={12} /> Verrouillée
          </span>
        ) : (
          <>
            <button onClick={() => openEdit(r)} className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-primary-700 dark:hover:text-gold-400 hover:bg-surface-alt dark:hover:bg-surface-dark-alt rounded transition-colors" title="Modifier les paramètres">
              <Pencil size={13} strokeWidth={1.6} />
            </button>
            <button onClick={() => askDelete(r)} disabled={busy === `d-${r.id}`} className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-40" title="Supprimer">
              <Trash2 size={13} strokeWidth={1.6} />
            </button>
          </>
        )}
      </div>
    )},
  ];

  const spec = specForTemplate(form.template);

  return (
    <PageShell
      icon={SlidersHorizontal}
      eyebrow="Configuration du solver"
      title="Contraintes"
      subtitle="Règles statiques (fondatrices, verrouillées) et dynamiques appliquées lors de la génération"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Nouvelle règle dynamique</Button>}
    >
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary-50/60 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/40">
        <ShieldAlert size={16} className="text-primary-700 dark:text-primary-300 shrink-0 mt-0.5" />
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
          Les <strong>9 règles statiques</strong> (H1–H9) sont toujours appliquées et non modifiables.
          Les <strong>règles dynamiques</strong> apparaissent dans la modale de génération du DAR : « cochée par défaut » définit leur état initial.
        </p>
      </div>

      <Table columns={COLS} data={data} loading={loading} emptyText="Aucune règle enregistrée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier la règle' : 'Nouvelle règle dynamique'}
        onConfirm={handleSave} loading={saving}
        confirmLabel={modal.item ? 'Enregistrer' : 'Créer la règle'}>
        <F label="Type de règle (template)" hint={modal.item ? "Le type d'une règle existante n'est pas modifiable." : undefined}>
          <select className={iCls} value={form.template} disabled={!!modal.item}
            onChange={e => onSelectTemplate(e.target.value)}>
            <option value="">— Choisir un type —</option>
            {templates.map(t => <option key={t.template} value={t.template}>{t.label}</option>)}
          </select>
        </F>
        {spec && (
          <>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted -mt-1">{spec.description}</p>
            <F label="Nom affiché">
              <input className={iCls} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder={spec.label} />
            </F>
            <F label="Description (optionnelle)">
              <textarea className={iCls} rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Explication affichée au DAR dans la modale de génération…" />
            </F>
            {spec.champs.map(champ => (
              <F key={champ.nom} label={champ.label}>
                {champ.type === 'choice' ? (
                  <select className={iCls} value={form.parametres[champ.nom] ?? ''} onChange={e => setParam(champ.nom, e.target.value)}>
                    <option value="">— Choisir —</option>
                    {champ.choix.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                ) : champ.type === 'int' ? (
                  <input type="number" className={iCls} min={champ.min ?? 0}
                    value={form.parametres[champ.nom] ?? ''} onChange={e => setParam(champ.nom, e.target.value)} />
                ) : (
                  <input className={iCls} value={form.parametres[champ.nom] ?? ''} onChange={e => setParam(champ.nom, e.target.value)} />
                )}
              </F>
            ))}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm.open} title="Supprimer cette règle ?" description={confirm.desc}
        confirmLabel="Supprimer" variant="danger"
        onConfirm={execDelete} onCancel={() => setConfirm({ open: false })}
      />
    </PageShell>
  );
}
