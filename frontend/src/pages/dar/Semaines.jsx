import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Plus, Play, Lock, Cpu, Globe, Download, FileText, Eye, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import AssistantResolutionModal from '../../components/ui/AssistantResolutionModal';
import { SkeletonCard } from '../../components/ui/Skeleton';
import useThemeStore from '../../store/themeStore';

const iCls = 'w-full bg-white dark:bg-surface-dark-alt border border-line dark:border-line-dark rounded-xl px-3.5 py-2.5 text-sm text-ink dark:text-ink-dark focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all placeholder:text-ink-subtle dark:placeholder:text-ink-dark-subtle';
function F({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const STEP_ORDER  = ['DRAFT', 'IMPORTS_OUVERTS', 'IMPORTS_CLOTURES', 'GENERE', 'PUBLIE'];
const STEP_LABELS = ['Créé', 'Imports ouverts', 'Clôturé', 'Généré', 'Publié'];

// Teinte d'accent par statut (hex) — sert à colorer l'arête givrée des cartes.
const STATUS_ACCENT = {
  DRAFT:            '#667085',
  IMPORTS_OUVERTS:  '#3A5FAF',
  IMPORTS_CLOTURES: '#B45309',
  GENERE:           '#8E6F38',
  PUBLIE:           '#0F6B45',
};

// hex → rgba avec alpha.
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* Bord « verre glacé » à la iOS : pas de filet plein, mais un liseré teinté
   translucide tout autour, un reflet glossy sur l'arête haute, un voile de
   teinte qui se dissout vers le bas, et un halo coloré doux dessous.
   `hover` renforce le halo (feedback d'élévation). */
function glassEdge(hex, isDark, hover = false) {
  const ring  = rgba(hex, isDark ? 0.34 : 0.24);
  const glow  = rgba(hex, isDark ? (hover ? 0.46 : 0.30) : (hover ? 0.52 : 0.40));
  const gloss = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.92)';
  return {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    backgroundImage: `linear-gradient(180deg, ${rgba(hex, isDark ? 0.12 : 0.07)} 0%, ${rgba(hex, 0)} 42%)`,
    boxShadow: [
      `inset 0 1px 0 ${gloss}`,        // reflet glossy sur l'arête haute
      `inset 0 0 0 1px ${ring}`,       // liseré givré teinté (tout le pourtour)
      hover
        ? `0 18px 40px -16px ${glow}`  // halo coloré accentué au survol
        : `0 12px 28px -16px ${glow}`,
    ].join(', '),
  };
}

const ACTIONS = {
  DRAFT:            [{ label: 'Ouvrir les imports',  icon: Play,     key: 'ouvrir-imports',   v: 'primary'   }],
  IMPORTS_OUVERTS:  [{ label: 'Clôturer les imports',icon: Lock,     key: 'cloturer-imports', v: 'primary'   }],
  IMPORTS_CLOTURES: [{ label: 'Générer le planning', icon: Cpu,      key: 'generer',          v: 'primary'   }],
  GENERE: [
    { label: 'Publier',     icon: Globe,    key: 'publier',     v: 'primary'   },
    { label: 'Voir grille', icon: Eye,      key: 'voir',        v: 'secondary' },
  ],
  PUBLIE: [
    { label: 'PDF',    icon: Download, key: 'export-pdf',  v: 'secondary' },
    { label: 'DOCX',   icon: FileText, key: 'export-docx', v: 'secondary' },
    { label: 'Grille', icon: Eye,      key: 'voir',        v: 'ghost'     },
  ],
};

const BLANK = { date_debut: '', date_fin: '', semestre: '1', annee_academique: '', numero_reference: '' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function Semaines() {
  const [semaines, setSemaines] = useState([]);
  const [annees, setAnnees]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [busy, setBusy]         = useState(null);
  const [resolution, setResolution] = useState(null);
  const [resolWeek, setResolWeek]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);   // semaine à supprimer
  const [deleting, setDeleting]     = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [sw, aa] = await Promise.all([api.get('/semaines/'), api.get('/annees-academiques/')]);
      const list = Array.isArray(sw.data) ? sw.data : (sw.data.results ?? []);
      setSemaines([...list].sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut)));
      const aas = Array.isArray(aa.data) ? aa.data : (aa.data.results ?? []);
      setAnnees(aas);
      const active = aas.find(a => a.active) ?? aas[0];
      if (active) setForm(f => ({ ...f, annee_academique: active.id }));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/semaines/', form);
      setModal(false);
      await load();
      toast.success('Semaine créée avec succès.');
    } catch (err) {
      toast.error(extractApiError(err));
    } finally { setSaving(false); }
  };

  // Suppression d'une semaine (et de toutes ses données) — repartir de zéro.
  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await api.delete(`/semaines/${confirmDel.id}/`);
      setConfirmDel(null);
      await load();
      toast.success('Semaine supprimée.');
    } catch (err) {
      toast.error(extractApiError(err, "La suppression a échoué. Réessayez."));
    } finally { setDeleting(false); }
  };

  // Libellés de succès par action de workflow.
  const SUCCESS = {
    'ouvrir-imports':   'Imports ouverts : les chefs peuvent envoyer leurs fichiers.',
    'cloturer-imports': 'Imports clôturés.',
    'publier':          'Semaine publiée avec succès.',
  };

  const handleAction = async (sw, key) => {
    if (key === 'voir') { navigate(`/dar/semaines/${sw.id}/planning`); return; }

    if (key === 'export-pdf' || key === 'export-docx') {
      const ext = key === 'export-pdf' ? 'pdf' : 'docx';
      setBusy(`${sw.id}-${key}`);
      try {
        const res = await api.post(`/semaines/${sw.id}/${key}/`, {}, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = Object.assign(document.createElement('a'), {
          href: url, download: `Planning_${sw.date_debut}_au_${sw.date_fin}.${ext}`,
        });
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast.success(`Export ${ext.toUpperCase()} téléchargé.`);
      } catch (err) {
        toast.error(extractApiError(err, "Échec de l'export. Réessayez."));
      } finally { setBusy(null); }
      return;
    }

    setBusy(`${sw.id}-${key}`);
    try {
      const { data } = await api.post(`/semaines/${sw.id}/${key}/`);
      await load();
      if (key === 'generer') {
        const placees = data?.placees ?? 0;
        const nonPlacees = data?.non_placees?.length ?? 0;
        toast.success(`Planning généré : ${placees} séance(s) placée(s).`);
        // Assistant de résolution : on ouvre la fenêtre de conseils dès qu'il
        // reste des cours non placés (raisons + suggestions concrètes).
        if (nonPlacees > 0) {
          toast.warning(`${nonPlacees} cours non placé(s) — voir l'Assistant de résolution.`);
          setResolution(data);
          setResolWeek(sw.id);
        }
      } else {
        toast.success(SUCCESS[key] ?? 'Action effectuée.');
      }
    } catch (err) {
      toast.error(extractApiError(err, "L'action a échoué. Vérifiez l'état de la semaine puis réessayez."));
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h1 className="heading-display text-3xl flex items-center gap-2.5" style={{ color: isDark ? '#F5F4EE' : '#1C2333' }}>
              Semaines
              {!loading && (
                <span className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted bg-surface-alt dark:bg-surface-dark-alt border border-line dark:border-line-dark px-2.5 py-1 rounded-full">
                  {semaines.length}
                </span>
              )}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: isDark ? '#A1A6B0' : '#667085' }}>Workflow hebdomadaire de planification</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Button onClick={() => setModal(true)}><Plus size={14} /> Nouvelle semaine</Button>
        </motion.div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <SkeletonCard key={i} height="h-28" />)}
        </div>
      ) : semaines.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl shadow-card py-16 text-center text-ink-muted dark:text-ink-dark-muted text-sm">
          Aucune semaine créée pour le moment.
        </motion.div>
      ) : (
        <div className="space-y-3">
          {semaines.map((sw, i) => {
            const stepIdx = STEP_ORDER.indexOf(sw.statut);
            const accent  = STATUS_ACCENT[sw.statut] ?? STATUS_ACCENT.DRAFT;
            return (
              <motion.div key={sw.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3, boxShadow: glassEdge(accent, isDark, true).boxShadow, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
                whileTap={{ scale: 0.995 }}
                onClick={() => navigate(`/dar/semaines/${sw.id}/planning`)}
                role="button"
                title="Ouvrir le détail de la semaine"
                style={glassEdge(accent, isDark)}
                className="rounded-3xl p-5 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    {/* Dates */}
                    <p className="text-ink font-bold text-base leading-tight">
                      Du {fmtDate(sw.date_debut)} au {fmtDate(sw.date_fin)}
                    </p>
                    <p className="text-ink-muted text-xs mt-1">
                      {sw.annee_academique?.libelle && `Année ${sw.annee_academique.libelle} · `}
                      Semestre {sw.semestre}
                      {sw.numero_reference && ` · Réf. ${sw.numero_reference}`}
                    </p>

                    {/* Progress dots */}
                    <div className="flex items-center gap-1 mt-3">
                      {STEP_ORDER.map((s, si) => (
                        <div key={s} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full transition-colors ${si <= stepIdx ? 'bg-primary-700' : 'bg-line'}`} />
                          {si < STEP_ORDER.length - 1 && (
                            <div className={`w-4 h-px ${si < stepIdx ? 'bg-primary-300' : 'bg-line'}`} />
                          )}
                        </div>
                      ))}
                      <span className="text-[10px] text-ink-subtle ml-1.5">
                        {STEP_LABELS[stepIdx] ?? sw.statut}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0"
                    onClick={(e) => e.stopPropagation()}>
                    <Badge status={sw.statut} />
                    {(ACTIONS[sw.statut] ?? []).map((act) => {
                      const Icon = act.icon;
                      const k = `${sw.id}-${act.key}`;
                      return (
                        <Button key={act.key} size="sm" variant={act.v}
                          onClick={() => handleAction(sw, act.key)} disabled={busy === k}>
                          <Icon size={12} />
                          {busy === k ? '…' : act.label}
                        </Button>
                      );
                    })}
                    {/* Suppression : toujours disponible, pour repartir de zéro. */}
                    <Button size="sm" variant="ghost"
                      title="Supprimer cette semaine"
                      aria-label="Supprimer cette semaine"
                      className="!px-2 hover:!text-danger"
                      onClick={() => setConfirmDel(sw)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle semaine"
        onConfirm={handleCreate} loading={saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Date de début">
            <input type="date" className={iCls} value={form.date_debut}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
              onChange={e => setForm({ ...form, date_debut: e.target.value })} required />
          </F>
          <F label="Date de fin">
            <input type="date" className={iCls} value={form.date_fin}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
              min={form.date_debut || undefined}
              onChange={e => setForm({ ...form, date_fin: e.target.value })} required />
          </F>
        </div>
        <F label="Semestre">
          <select className={iCls} value={form.semestre}
            onChange={e => setForm({ ...form, semestre: e.target.value })}>
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </select>
        </F>
        <F label="Année académique">
          <select className={iCls} value={form.annee_academique}
            onChange={e => setForm({ ...form, annee_academique: e.target.value })}>
            {annees.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
          </select>
        </F>
        <F label="N° de référence (optionnel)">
          <input type="text" className={iCls} value={form.numero_reference}
            placeholder="ex : 26-00102"
            onChange={e => setForm({ ...form, numero_reference: e.target.value })} />
        </F>
      </Modal>

      <AssistantResolutionModal
        open={!!resolution}
        onClose={() => setResolution(null)}
        result={resolution}
        semaineId={resolWeek}
        onApplied={load}
      />

      {/* Confirmation de suppression — action destructive et irréversible. */}
      <Modal open={!!confirmDel} onClose={() => !deleting && setConfirmDel(null)}
        title="Supprimer la semaine">
        {confirmDel && (
          <div className="space-y-4">
            <div className="flex gap-3 p-3.5 rounded-xl bg-danger/5 border border-danger/30">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
              <div className="text-sm text-ink dark:text-ink-dark">
                <p className="font-semibold text-ink-strong dark:text-ink-dark-strong">
                  Cette action est irréversible.
                </p>
                <p className="mt-1 text-ink-muted dark:text-ink-dark-muted">
                  La semaine <span className="font-semibold">du {fmtDate(confirmDel.date_debut)} au {fmtDate(confirmDel.date_fin)}</span> sera supprimée,
                  ainsi que <span className="font-semibold">tous ses imports, demandes de cours, séances et archives</span> (fichiers Excel et PDF compris).
                </p>
              </div>
            </div>

            {confirmDel.statut === 'PUBLIE' && (
              <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                ⚠️ Cette semaine est <strong>publiée</strong> : les chefs de département n'y auront plus accès.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm"
                onClick={() => setConfirmDel(null)} disabled={deleting}>
                Annuler
              </Button>
              <Button variant="danger" size="sm"
                onClick={handleDelete} disabled={deleting}>
                <Trash2 size={13} />
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
