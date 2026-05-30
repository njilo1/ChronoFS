import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import useAuthStore from '../../store/authStore';
import { fetchMe, updateProfile, changePassword } from '../../services/auth';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';

const GRADES = [['DR', 'Dr'], ['PR', 'Pr'], ['M', 'M'], ['MME', 'Mme'], ['ING', 'Ing']];

const inputCls =
  'w-full bg-surface-alt dark:bg-surface-dark-alt border border-line dark:border-line-dark ' +
  'rounded-lg px-3 py-2 text-sm text-ink dark:text-ink-dark placeholder:text-ink-subtle/50 ' +
  'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all';
const labelCls =
  'text-ink-muted dark:text-ink-dark-muted text-[10px] font-semibold mb-1 block uppercase tracking-widest';

// Robustesse indicative (0–4) : longueur + variété de caractères.
function scorePassword(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 4);
}
const STRENGTH = [
  { label: 'Trop court', color: '#9CA3AF' },
  { label: 'Faible',     color: '#B91C1C' },
  { label: 'Moyen',      color: '#B45309' },
  { label: 'Bon',        color: '#0369A1' },
  { label: 'Fort',       color: '#0F6B45' },
];

const EMPTY_INFO = { username: '', first_name: '', last_name: '', email: '', telephone: '', grade: '' };

// Champ mot de passe avec bouton afficher/masquer. Défini au niveau module
// (et non dans ProfilModal) pour ne pas être recréé à chaque rendu — sinon
// l'input perdrait le focus à chaque frappe.
function PasswordField({ label, value, onChange, show, onToggle, placeholder, autoComplete }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={inputCls}
          style={{ paddingRight: 38 }}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function ProfilModal({ open, onClose }) {
  const user   = useAuthStore((s) => s.user);
  const isChef = user?.role === 'CHEF_DEPT';

  const [info, setInfo]         = useState(EMPTY_INFO);
  const [readonly, setReadonly] = useState({ role_display: '', departement_nom: '', last_login: null });
  const [savingInfo, setSavingInfo] = useState(false);

  const [pwd, setPwd]   = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [show, setShow] = useState({ ancien: false, nouveau: false, confirmation: false });
  const [savingPwd, setSavingPwd] = useState(false);

  // À l'ouverture : recharge le profil frais pour préremplir le formulaire.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchMe()
      .then((u) => {
        if (!alive) return;
        setInfo({
          username:   u.username   ?? '',
          first_name: u.first_name ?? '',
          last_name:  u.last_name  ?? '',
          email:      u.email      ?? '',
          telephone:  u.telephone  ?? '',
          grade:      u.grade      ?? '',
        });
        setReadonly({
          role_display:    u.role_display ?? u.role ?? '',
          departement_nom: u.departement_nom ?? '',
          last_login:      u.last_login ?? null,
        });
      })
      .catch(() => {});
    setPwd({ ancien: '', nouveau: '', confirmation: '' });
    setShow({ ancien: false, nouveau: false, confirmation: false });
    return () => { alive = false; };
  }, [open]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const payload = {
        username:   info.username.trim(),
        first_name: info.first_name,
        last_name:  info.last_name,
        email:      info.email,
        telephone:  info.telephone,
      };
      if (isChef) payload.grade = info.grade;
      await updateProfile(payload);
      toast.success('Profil mis à jour.');
    } catch (err) {
      toast.error(extractApiError(err, "Impossible d'enregistrer le profil."));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwd.nouveau !== pwd.confirmation) {
      toast.error('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setSavingPwd(true);
    try {
      await changePassword(pwd.ancien, pwd.nouveau, pwd.confirmation);
      toast.success('Mot de passe modifié.');
      setPwd({ ancien: '', nouveau: '', confirmation: '' });
    } catch (err) {
      toast.error(extractApiError(err, 'Échec du changement de mot de passe.'));
    } finally {
      setSavingPwd(false);
    }
  };

  const strength = scorePassword(pwd.nouveau);
  const lastLoginTxt = readonly.last_login
    ? new Date(readonly.last_login).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const togglePwd = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));
  const onPwd = (field) => (e) => setPwd((p) => ({ ...p, [field]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Mon profil">
      {/* Bandeau lecture seule */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-muted dark:text-ink-dark-muted -mt-1">
        <span><span className="font-semibold text-ink dark:text-ink-dark">Rôle :</span> {readonly.role_display || '—'}</span>
        {isChef && (
          <span><span className="font-semibold text-ink dark:text-ink-dark">Département :</span> {readonly.departement_nom || '—'}</span>
        )}
        <span><span className="font-semibold text-ink dark:text-ink-dark">Dernière connexion :</span> {lastLoginTxt}</span>
      </div>

      {/* ── Section Informations ── */}
      <form onSubmit={handleSaveInfo} className="space-y-3 pt-1">
        <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em]">
          Informations
        </p>
        <div>
          <label className={labelCls}>Nom d'utilisateur</label>
          <input className={inputCls} value={info.username}
            onChange={(e) => setInfo((f) => ({ ...f, username: e.target.value }))}
            placeholder="nom.utilisateur" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Prénom</label>
            <input className={inputCls} value={info.first_name}
              onChange={(e) => setInfo((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Nom</label>
            <input className={inputCls} value={info.last_name}
              onChange={(e) => setInfo((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={info.email}
              onChange={(e) => setInfo((f) => ({ ...f, email: e.target.value }))}
              placeholder="nom@exemple.cm" />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input className={inputCls} value={info.telephone}
              onChange={(e) => setInfo((f) => ({ ...f, telephone: e.target.value }))}
              placeholder="+237…" />
          </div>
        </div>
        {isChef && (
          <div>
            <label className={labelCls}>Grade</label>
            <select className={inputCls} value={info.grade}
              onChange={(e) => setInfo((f) => ({ ...f, grade: e.target.value }))}>
              <option value="">— Aucun —</option>
              {GRADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={savingInfo}>
            {savingInfo ? 'Enregistrement…' : 'Enregistrer les informations'}
          </Button>
        </div>
      </form>

      <div className="border-t border-line dark:border-line-dark" />

      {/* ── Section Mot de passe ── */}
      <form onSubmit={handleChangePwd} className="space-y-3">
        <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em]">
          Mot de passe
        </p>
        <PasswordField label="Mot de passe actuel" value={pwd.ancien} onChange={onPwd('ancien')}
          show={show.ancien} onToggle={() => togglePwd('ancien')} placeholder="••••••••" autoComplete="current-password" />
        <PasswordField label="Nouveau mot de passe" value={pwd.nouveau} onChange={onPwd('nouveau')}
          show={show.nouveau} onToggle={() => togglePwd('nouveau')} placeholder="••••••••" autoComplete="new-password" />
        {pwd.nouveau && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface-alt dark:bg-surface-dark-alt rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${(strength / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: STRENGTH[strength].color }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums" style={{ color: STRENGTH[strength].color }}>
              {STRENGTH[strength].label}
            </span>
          </div>
        )}
        <PasswordField label="Confirmer le mot de passe" value={pwd.confirmation} onChange={onPwd('confirmation')}
          show={show.confirmation} onToggle={() => togglePwd('confirmation')} placeholder="••••••••" autoComplete="new-password" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="secondary"
            disabled={savingPwd || !pwd.ancien || !pwd.nouveau || !pwd.confirmation}>
            {savingPwd ? 'Modification…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
