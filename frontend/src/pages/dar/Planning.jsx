import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Filter, LayoutGrid, Download, FileText, AlertCircle, X,
  Play, Lock, Cpu, Globe, Check, RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import GrilleEDT from '../../components/planning/GrilleEDT';
import SeanceEditModal from '../../components/planning/SeanceEditModal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import useThemeStore from '../../store/themeStore';

const STEP_ORDER = ['DRAFT', 'IMPORTS_OUVERTS', 'IMPORTS_CLOTURES', 'GENERE', 'PUBLIE'];
const rangOf = (s) => STEP_ORDER.indexOf(s);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

/* ─── Une étape de la frise workflow ──────────────────────────────────── */
function WorkflowStep({ num, title, icon: Icon, state, children }) {
  const pastille =
    state === 'done'
      ? 'bg-success text-white border-success'
      : state === 'active'
        ? 'bg-primary-900 text-white border-primary-900 dark:bg-primary-900 ring-4 ring-primary-500/15'
        : 'bg-surface-alt dark:bg-surface-dark-alt text-ink-subtle dark:text-ink-dark-subtle border-line dark:border-line-dark';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${pastille}`}>
          {state === 'done' ? <Check size={15} strokeWidth={2.5} /> : num}
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={13} className={state === 'todo' ? 'text-ink-subtle dark:text-ink-dark-subtle' : 'text-primary-700 dark:text-primary-300'} />
          <span className={`text-sm font-semibold truncate ${state === 'todo' ? 'text-ink-subtle dark:text-ink-dark-subtle' : 'text-ink-strong dark:text-ink-dark-strong'}`}>
            {title}
          </span>
        </div>
      </div>
      <div className="pl-[42px] min-h-[34px]">{children}</div>
    </div>
  );
}

export default function Planning() {
  const { id } = useParams();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const [semaine, setSemaine] = useState(null);
  const [seances, setSeances] = useState([]);
  const [taux, setTaux]       = useState([]);
  const [salles, setSalles]   = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ues, setUes]         = useState([]);
  const [salleId, setSalleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(null);
  const [moveError, setMoveError] = useState('');
  const [editSeance, setEditSeance] = useState(null);

  const loadSeances = useCallback(async () => {
    const r = await api.get(`/semaines/${id}/seances/`);
    setSeances(Array.isArray(r.data) ? r.data : (r.data.results ?? []));
  }, [id]);

  const loadSemaine = useCallback(async () => {
    const r = await api.get(`/semaines/${id}/`);
    setSemaine(r.data);
  }, [id]);

  const loadTaux = useCallback(async () => {
    try {
      const r = await api.get(`/semaines/${id}/taux-programmation/`);
      setTaux(Array.isArray(r.data) ? r.data : (r.data.results ?? []));
    } catch { /* non bloquant : le panneau reste simplement vide */ }
  }, [id]);

  useEffect(() => {
    // page_size élevé : on veut TOUTES les salles/UE/enseignants pour les
    // listes déroulantes de la modale (sinon la pagination en tronque).
    Promise.all([
      api.get(`/semaines/${id}/`),
      api.get(`/semaines/${id}/seances/`),
      api.get('/salles/', { params: { page_size: 500 } }),
      api.get('/enseignants/', { params: { page_size: 500 } }),
      api.get('/ues/', { params: { page_size: 500 } }),
    ]).then(([sw, sc, sl, en, ue]) => {
      const arr = (r) => Array.isArray(r.data) ? r.data : (r.data.results ?? []);
      setSemaine(sw.data);
      setSeances(arr(sc));
      setSalles(arr(sl));
      setEnseignants(arr(en));
      setUes(arr(ue));
    }).finally(() => setLoading(false));
    loadTaux();
  }, [id, loadTaux]);

  // ── Actions de workflow (ouvrir / clôturer / générer / publier) ────────
  const handleWorkflow = async (key) => {
    setBusy(key);
    try {
      const { data } = await api.post(`/semaines/${id}/${key}/`);
      await Promise.all([loadSemaine(), loadSeances(), loadTaux()]);
      if (key === 'generer') {
        const placees = data?.placees ?? 0;
        const nonPlacees = data?.non_placees?.length ?? 0;
        toast.success(`Planning généré : ${placees} séance(s) placée(s).`);
        if (nonPlacees > 0) toast.warning(`${nonPlacees} cours n'ont pas pu être placés.`);
      } else {
        toast.success({
          'ouvrir-imports':   'Imports ouverts.',
          'cloturer-imports': 'Imports clôturés.',
          'publier':          'Semaine publiée avec succès.',
        }[key] ?? 'Action effectuée.');
      }
    } catch (err) {
      toast.error(extractApiError(err));
    } finally { setBusy(null); }
  };

  const handleExport = async (ext) => {
    setBusy(`export-${ext}`);
    try {
      const res = await api.post(`/semaines/${id}/export-${ext}/`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `Planning_${semaine?.date_debut ?? id}.${ext}`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Export ${ext.toUpperCase()} téléchargé.`);
    } catch (err) {
      toast.error(extractApiError(err, "Échec de l'export."));
    } finally { setBusy(null); }
  };

  // ── Drag-drop : déplacement optimiste + rollback ───────────────────────
  const handleMove = async (seanceId, jour, creneau) => {
    setMoveError('');
    const ancienne = seances.find(s => s.id === seanceId);
    if (!ancienne) return;
    setSeances(prev => prev.map(s => (s.id === seanceId ? { ...s, jour, creneau } : s)));
    try {
      await api.patch(`/seances/${seanceId}/`, { jour, creneau });
      toast.success('Séance déplacée.');
    } catch (err) {
      setSeances(prev => prev.map(s => (s.id === seanceId ? ancienne : s)));
      setMoveError(extractApiError(err, 'Déplacement refusé.'));
    }
  };

  // ── Édition au clic (modale) : PATCH contenu ───────────────────────────
  const handleEditSave = async (patch) => {
    await api.patch(`/seances/${editSeance.id}/`, patch);  // throw si refus → modale reste ouverte
    await loadSeances();
    toast.success('Séance modifiée avec succès.');
  };

  const seancesFiltrees = salleId ? seances.filter(s => String(s.salle) === salleId) : seances;
  const sallesActives   = salles.filter(sl => seances.some(s => s.salle === sl.id));

  const rang = semaine ? rangOf(semaine.statut) : 0;
  const planningPret = rang >= rangOf('GENERE');   // séances disponibles
  const progressPct  = Math.round((rang / (STEP_ORDER.length - 1)) * 100);

  // États des 4 étapes selon le statut courant
  const stepImports = rang >= 2 ? 'done' : 'active';
  const stepGen     = rang >= 3 ? 'done' : rang === 2 ? 'active' : 'todo';
  const stepPub     = rang === 4 ? 'done' : rang === 3 ? 'active' : 'todo';
  const stepExport  = rang >= 3 ? 'active' : 'todo';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/dar/semaines"
          className="mt-1.5 p-1.5 text-ink-muted hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-surface-dark-alt rounded-lg transition-all shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm">
            <LayoutGrid size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-2xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>Planning</h1>
            {semaine && (
              <p className="text-sm mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>
                Du {fmtDate(semaine.date_debut)} au {fmtDate(semaine.date_fin)}
                <Badge status={semaine.statut} />
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Frise workflow — 4 étapes toujours visibles */}
      {loading ? (
        <SkeletonCard height="h-32" />
      ) : semaine && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          {/* Barre de progression globale */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-1.5 bg-surface-alt dark:bg-surface-dark-alt rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary-700 dark:bg-gold-500 rounded-full"
                initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }} />
            </div>
            <span className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted tabular-nums">{progressPct}%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Étape 1 — Imports */}
            <WorkflowStep num={1} title="Imports" icon={Lock} state={stepImports}>
              {rang === 0 && (
                <Button size="sm" onClick={() => handleWorkflow('ouvrir-imports')} disabled={busy === 'ouvrir-imports'}>
                  <Play size={12} /> {busy === 'ouvrir-imports' ? '…' : 'Ouvrir les imports'}
                </Button>
              )}
              {rang === 1 && (
                <Button size="sm" onClick={() => handleWorkflow('cloturer-imports')} disabled={busy === 'cloturer-imports'}>
                  <Lock size={12} /> {busy === 'cloturer-imports' ? '…' : 'Clôturer les imports'}
                </Button>
              )}
              {rang >= 2 && <span className="text-xs text-success font-medium">Imports clôturés</span>}
            </WorkflowStep>

            {/* Étape 2 — Génération */}
            <WorkflowStep num={2} title="Génération" icon={Cpu} state={stepGen}>
              {rang === 2 && (
                <Button size="sm" onClick={() => handleWorkflow('generer')} disabled={busy === 'generer'}>
                  <Cpu size={12} /> {busy === 'generer' ? 'Génération…' : 'Générer le planning'}
                </Button>
              )}
              {rang === 3 && (
                <Button variant="secondary" size="sm" onClick={() => handleWorkflow('generer')} disabled={busy === 'generer'}>
                  <RefreshCw size={12} /> {busy === 'generer' ? 'Génération…' : 'Régénérer'}
                </Button>
              )}
              {rang < 2 && <span className="text-xs text-ink-subtle dark:text-ink-dark-subtle">En attente de clôture</span>}
              {rang === 4 && <span className="text-xs text-success font-medium">Planning généré</span>}
            </WorkflowStep>

            {/* Étape 3 — Publication */}
            <WorkflowStep num={3} title="Publication" icon={Globe} state={stepPub}>
              {rang === 3 && (
                <Button size="sm" onClick={() => handleWorkflow('publier')} disabled={busy === 'publier'}>
                  <Globe size={12} /> {busy === 'publier' ? '…' : 'Publier'}
                </Button>
              )}
              {rang < 3 && <span className="text-xs text-ink-subtle dark:text-ink-dark-subtle">Après génération</span>}
              {rang === 4 && <span className="text-xs text-success font-medium">Semaine publiée</span>}
            </WorkflowStep>

            {/* Étape 4 — Export */}
            <WorkflowStep num={4} title="Export" icon={Download} state={stepExport}>
              {planningPret ? (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} disabled={busy === 'export-pdf'}>
                    <Download size={12} /> {busy === 'export-pdf' ? '…' : 'PDF'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleExport('docx')} disabled={busy === 'export-docx'}>
                    <FileText size={12} /> {busy === 'export-docx' ? '…' : 'DOCX'}
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-ink-subtle dark:text-ink-dark-subtle">Après génération</span>
              )}
            </WorkflowStep>
          </div>
        </motion.div>
      )}

      {/* Taux de programmation par département */}
      {!loading && taux.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={14} className="text-primary-700 dark:text-primary-300" />
            <h2 className="text-sm font-bold text-ink-strong dark:text-ink-dark-strong">
              Taux de programmation par département
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taux.map((t) => {
              const couleur = t.taux >= 100 ? 'bg-success' : t.taux >= 60 ? 'bg-gold-500' : 'bg-danger';
              return (
                <div key={t.departement_id}
                  className="border border-line dark:border-line-dark rounded-xl p-3.5 bg-surface-subtle dark:bg-surface-dark-alt">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-ink-strong dark:text-ink-dark-strong truncate" title={t.nom}>
                      {t.code}
                    </span>
                    <span className="text-[13px] font-bold tabular-nums text-ink dark:text-ink-dark">
                      {t.taux}% <span className="text-[11px] font-medium text-ink-subtle">({t.placees}/{t.total})</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-alt dark:bg-surface-dark rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${couleur}`}
                      initial={{ width: 0 }} animate={{ width: `${Math.min(t.taux, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filtre salle + aide */}
      {planningPret && sallesActives.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 flex-wrap">
          <Filter size={13} className="text-ink-muted shrink-0" />
          <select value={salleId} onChange={e => setSalleId(e.target.value)}
            className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-xl px-3.5 py-2 text-sm text-ink dark:text-ink-dark focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all shadow-card">
            <option value="">Toutes les salles ({seances.length} séances)</option>
            {sallesActives.map(sl => (
              <option key={sl.id} value={sl.id}>Salle {sl.nom} — {sl.campus?.nom}</option>
            ))}
          </select>
          <span className="text-[11px] text-ink-subtle italic ml-auto">
            Glissez une séance pour la déplacer · cliquez dessus pour modifier prof, salle, UE…
          </span>
        </motion.div>
      )}

      {/* Bandeau d'erreur de déplacement */}
      <AnimatePresence>
        {moveError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-2.5 bg-danger/10 border border-danger/25 text-danger rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="flex-1">{moveError}</span>
            <button onClick={() => setMoveError('')} className="shrink-0 hover:opacity-70 transition-opacity">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grille (visible une fois le planning généré) */}
      {!loading && planningPret && (
        seances.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl shadow-card text-center py-16 text-ink-muted text-sm">
            Aucune séance générée pour cette semaine.
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <GrilleEDT seances={seancesFiltrees} onMove={handleMove} onEdit={setEditSeance} />
          </motion.div>
        )
      )}

      {/* Avant génération : invite */}
      {!loading && !planningPret && (
        <div className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl shadow-card text-center py-16 text-ink-muted dark:text-ink-dark-muted text-sm">
          Le planning n'est pas encore généré. Suivez les étapes ci-dessus.
        </div>
      )}

      {/* Modale d'édition d'une séance */}
      <SeanceEditModal
        seance={editSeance}
        enseignants={enseignants}
        salles={salles}
        ues={ues}
        onSave={handleEditSave}
        onClose={() => setEditSeance(null)}
      />
    </div>
  );
}
