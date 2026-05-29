import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { Plus, RefreshCw, UserX, UserCheck, Pencil, UserCog, Trash2, KeyRound, Copy } from 'lucide-react';
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
function F({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const BLANK = {
  username: '', first_name: '', last_name: '',
  grade: 'PR', email: '', telephone: '',
  departement: '', password: '', is_active: true,
};

export default function Chefs() {
  const { data, loading, update, remove, refetch } = useCrud('chefs-departement', { nom: 'Chef de département', genre: 'm' });
  const [deps, setDeps]     = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy]     = useState(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState({ open: false, id: null, action: null, label: '', desc: '', row: null });
  const [pwdNotif, setPwdNotif] = useState(null);  // { username, password }

  useEffect(() => {
    api.get('/departements/').then(r =>
      setDeps(Array.isArray(r.data) ? r.data : (r.data.results ?? []))
    );
  }, []);

  const openCreate = () => { setForm(BLANK); setModal({ open: true, item: null }); };
  const openEdit   = (item) => {
    setForm({
      username:    item.username   ?? '',
      first_name:  item.first_name ?? '',
      last_name:   item.last_name  ?? '',
      grade:       item.grade      ?? 'PR',
      email:       item.email      ?? '',
      telephone:   item.telephone  ?? '',
      departement: item.departement?.id ?? item.departement ?? '',
      password:    '',
      is_active:   item.is_active !== false,
    });
    setModal({ open: true, item });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // backend en générera un si création
      if (modal.item) {
        await update(modal.item.id, payload);  // toast succès géré par useCrud
      } else {
        // Pour create, on capture le mot de passe généré si présent
        const res = await api.post('/chefs-departement/', payload);
        if (res.data?.mot_de_passe_genere) {
          setPwdNotif({ username: res.data.username, password: res.data.mot_de_passe_genere });
        }
        await refetch();
        toast.success('Chef de département ajouté avec succès.');
      }
      setModal({ open: false, item: null });
    } catch (err) {
      toast.error(extractApiError(err));
    } finally { setSaving(false); }
  };

  // — Actions ligne par ligne —
  const askResetPwd = (row) => setConfirm({
    open: true, id: row.id, action: 'reset', row,
    label: 'Réinitialiser', desc: `Un nouveau mot de passe sera généré pour ${row.username}.`,
  });

  const askToggle = (row) => {
    const active = row.is_active !== false;
    setConfirm({
      open: true, id: row.id, action: 'toggle', row,
      label: active ? 'Désactiver' : 'Activer',
      desc: active
        ? `${row.username} ne pourra plus se connecter à ChronoFS.`
        : `${row.username} retrouvera l'accès à ChronoFS.`,
    });
  };

  const askDelete = (row) => setConfirm({
    open: true, id: row.id, action: 'delete', row,
    label: 'Supprimer', desc: `Le compte ${row.username} sera définitivement supprimé. Action irréversible.`,
  });

  const execConfirm = async () => {
    const { id, action, row } = confirm;
    setConfirm({ open: false });
    setBusy(`${action}-${id}`);
    try {
      if (action === 'reset') {
        const res = await api.post(`/chefs-departement/${id}/reset-password/`);
        if (res.data?.mot_de_passe_genere) {
          setPwdNotif({ username: res.data.username, password: res.data.mot_de_passe_genere });
        }
        toast.success('Mot de passe réinitialisé.');
      }
      if (action === 'toggle') {
        const active = row.is_active !== false;
        await api.patch(`/chefs-departement/${id}/`, { is_active: !active });
        await refetch();
        toast.success(active ? 'Compte désactivé.' : 'Compte activé.');
      }
      if (action === 'delete') {
        await remove(id);  // toast succès géré par useCrud
      }
    } catch (err) {
      toast.error(extractApiError(err));
    } finally { setBusy(null); }
  };

  const COLS = [
    { key: 'username', label: 'Identifiant', render: r => (
      <span className="font-semibold text-ink-strong dark:text-ink-dark-strong">{r.username}</span>
    )},
    { key: 'nom_complet', label: 'Nom complet', render: r => {
      const full = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      return <span className="text-ink dark:text-ink-dark">{full || '—'}</span>;
    }},
    { key: 'departement', label: 'Département', render: r => (
      <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
        {r.departement_nom ?? r.departement?.nom ?? '—'}
      </span>
    )},
    { key: 'email', label: 'Email', render: r => (
      <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.email || '—'}</span>
    )},
    { key: 'is_active', label: 'Statut', render: r => {
      const active = r.is_active !== false;
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border font-semibold ${active ? 'bg-success/10 text-success border-success/25 dark:bg-success/20 dark:text-emerald-300 dark:border-success/30' : 'bg-danger/10 text-danger border-danger/25 dark:bg-danger/20 dark:text-red-300 dark:border-danger/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-danger'}`} />
          {active ? 'Actif' : 'Inactif'}
        </span>
      );
    }},
    { key: '_act', label: 'Actions', render: r => {
      const active = r.is_active !== false;
      return (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)}
            className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-primary-700 dark:hover:text-gold-400 hover:bg-surface-alt dark:hover:bg-surface-dark-alt rounded transition-colors"
            title="Modifier">
            <Pencil size={13} strokeWidth={1.6} />
          </button>
          <button onClick={() => askResetPwd(r)} disabled={busy === `reset-${r.id}`}
            className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-500/10 rounded transition-colors disabled:opacity-40"
            title="Réinitialiser le mot de passe">
            <RefreshCw size={13} strokeWidth={1.6} />
          </button>
          <button onClick={() => askToggle(r)} disabled={busy === `toggle-${r.id}`}
            className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
              active
                ? 'text-ink-muted dark:text-ink-dark-muted hover:text-warning hover:bg-warning/10'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-success hover:bg-success/10'
            }`}
            title={active ? 'Désactiver' : 'Activer'}>
            {active ? <UserX size={13} strokeWidth={1.6} /> : <UserCheck size={13} strokeWidth={1.6} />}
          </button>
          <button onClick={() => askDelete(r)} disabled={busy === `delete-${r.id}`}
            className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-40"
            title="Supprimer définitivement">
            <Trash2 size={13} strokeWidth={1.6} />
          </button>
        </div>
      );
    }},
  ];

  const filtered = data.filter(c =>
    !search ||
    (c.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (`${c.first_name ?? ''} ${c.last_name ?? ''}`).toLowerCase().includes(search.toLowerCase()) ||
    ((c.departement_nom ?? c.departement?.nom) ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const copyPwd = () => {
    if (pwdNotif?.password) navigator.clipboard?.writeText(pwdNotif.password);
  };

  return (
    <PageShell
      icon={UserCog}
      title="Chefs de département"
      subtitle="Comptes et accès des chefs de département"
      count={loading ? null : data.length}
      action={<Button onClick={openCreate}><Plus size={14} /> Ajouter un chef</Button>}
    >
      <motion.input
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="input-field max-w-sm shadow-card"
        placeholder="Rechercher par identifiant, nom ou département…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table columns={COLS} data={filtered} loading={loading}
        emptyText="Aucun chef de département enregistré." />

      {/* Modale création/édition */}
      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier le chef' : 'Nouveau chef de département'}
        onConfirm={handleSave} loading={saving}>
        <F label="Identifiant (login)">
          <input className={iCls} value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="ex : jean.dupont"
            disabled={!!modal.item} />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Prénom">
            <input className={iCls} value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })}
              placeholder="Jean" />
          </F>
          <F label="Nom">
            <input className={iCls} value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })}
              placeholder="Dupont" />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Grade">
            <select className={iCls} value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value })}>
              <option value="PR">Professeur</option>
              <option value="DR">Docteur</option>
              <option value="M">Monsieur</option>
              <option value="MME">Madame</option>
              <option value="ING">Ingénieur</option>
            </select>
          </F>
          <F label="Département">
            <select className={iCls} value={form.departement}
              onChange={e => setForm({ ...form, departement: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {deps.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
            </select>
          </F>
        </div>
        <F label="Email">
          <input type="email" className={iCls} value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="chef@univ-ebolowa.cm" />
        </F>
        <F label="Téléphone">
          <input className={iCls} value={form.telephone}
            onChange={e => setForm({ ...form, telephone: e.target.value })}
            placeholder="+237 6XX XX XX XX" />
        </F>
        <F label={modal.item ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe (laisser vide → généré automatiquement)'}>
          <input type="password" className={iCls} value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••" />
        </F>
      </Modal>

      {/* Confirmation suppression / désactivation / reset */}
      <ConfirmDialog
        open={confirm.open}
        title={
          confirm.action === 'delete' ? 'Supprimer ce chef ?' :
          confirm.action === 'reset'  ? 'Réinitialiser le mot de passe ?' :
          `${confirm.label} ce chef ?`
        }
        description={confirm.desc}
        confirmLabel={confirm.label}
        variant={confirm.action === 'delete' ? 'danger' : 'primary'}
        onConfirm={execConfirm}
        onCancel={() => setConfirm({ open: false })}
      />

      {/* Notification mot de passe généré (à copier — affiché 1 seule fois) */}
      <Modal
        open={!!pwdNotif}
        onClose={() => setPwdNotif(null)}
        title="Mot de passe généré"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-md bg-gold-50 border border-gold-200 dark:bg-gold-500/10 dark:border-gold-500/30">
            <KeyRound size={16} className="text-gold-700 dark:text-gold-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gold-800 dark:text-gold-200 leading-relaxed">
              Ce mot de passe ne sera <strong>plus jamais affiché</strong>. Communiquez-le
              au chef via un canal de confiance.
            </p>
          </div>
          <F label="Identifiant">
            <input className={iCls} value={pwdNotif?.username ?? ''} readOnly />
          </F>
          <F label="Mot de passe">
            <div className="flex gap-2">
              <input className={iCls + ' font-mono tracking-wider'}
                value={pwdNotif?.password ?? ''} readOnly />
              <Button variant="secondary" size="sm" onClick={copyPwd}>
                <Copy size={13} /> Copier
              </Button>
            </div>
          </F>
        </div>
      </Modal>
    </PageShell>
  );
}
