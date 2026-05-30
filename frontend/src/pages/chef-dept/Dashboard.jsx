import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  FileUp, BookOpen, Users, LayoutGrid, ChevronRight, ArrowUpRight,
  GraduationCap, Send,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];
const GRADE_LABELS = { DR: 'Dr', PR: 'Pr', M: 'M.', MME: 'Mme', ING: 'Ing.' };
const PIE_COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#06B6D4'];

function arr(r) { return Array.isArray(r.data) ? r.data : (r.data?.results ?? []); }

function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const t = setTimeout(() => {
      const start = Date.now();
      const dur = 800;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return val;
}

function KpiCard({ icon: Icon, label, value, sub, to, delay }) {
  const count = useCountUp(value ?? 0, delay * 1000 + 250);
  const inner = (
    <div className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card overflow-hidden relative group h-full">
      <div className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/50 dark:group-hover:bg-primary-950/20 transition-colors duration-300 pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm">
          <Icon size={15} className="text-white" />
        </div>
        {to && <ArrowUpRight size={11} className="text-ink-subtle mt-1" />}
      </div>
      <p className="num text-[32px] font-bold text-ink-strong dark:text-ink-dark-strong leading-none tracking-tight">{count}</p>
      <p className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-subtle mt-0.5">{sub}</p>}
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(30,58,138,0.14)' }}
      className="cursor-default"
    >
      {to ? <Link to={to} className="block h-full">{inner}</Link> : inner}
    </motion.div>
  );
}

function ChartCard({ eyebrow, title, delay, children, empty }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card"
    >
      <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em] mb-0.5">{eyebrow}</p>
      <h3 className="heading-display text-ink-strong dark:text-ink-dark-strong text-xl mb-4">{title}</h3>
      {empty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-ink-muted dark:text-ink-dark-muted text-center px-4">
          {empty}
        </div>
      ) : children}
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, to, description, delay }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3 }}>
      <Link to={to}
        className="flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-xl hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 transition-all group shadow-card">
        <div className="p-2 bg-primary-50 dark:bg-primary-950/40 group-hover:bg-primary-100 rounded-lg transition-colors shrink-0">
          <Icon size={15} className="text-primary-700 dark:text-primary-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink dark:text-ink-dark group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">{label}</p>
          {description && <p className="text-xs text-ink-muted dark:text-ink-dark-muted truncate">{description}</p>}
        </div>
        <ChevronRight size={13} className="ml-auto text-ink-subtle group-hover:text-primary-500 shrink-0 transition-colors" />
      </Link>
    </motion.div>
  );
}

/* ─── Jauge semi-circulaire à aiguille (style compteur de vitesse) ──────── */
// Repère SVG : centre (100,100), rayon 80. L'arc va de 180° (gauche, 0 %)
// à 0° (droite, 100 %) en passant par le haut. L'aiguille pivote de 0° à
// 180° dans le sens horaire pour balayer cette plage.
const GAUGE_R = 80;
const GAUGE_ARC = Math.PI * GAUGE_R; // longueur du demi-cercle

// pct (0–100) → point (x,y) sur un arc de rayon donné
function gaugePoint(pct, radius) {
  const angle = Math.PI * (1 - pct / 100); // radians, 180°→0°
  return { x: 100 + radius * Math.cos(angle), y: 100 - radius * Math.sin(angle) };
}

function RadialGauge({ value, placees, total, delay = 0 }) {
  const pct = Math.max(0, Math.min(value, 100));
  const offset = GAUGE_ARC * (1 - pct / 100);
  const count = useCountUp(value, delay * 1000 + 300);

  const ticks = [0, 25, 50, 75, 100]; // graduations principales
  const arcPath = 'M 20 100 A 80 80 0 0 1 180 100';

  // Aiguille : on anime un compteur 0→pct et on en déduit directement le bout
  // de l'aiguille sur l'arc. 0 % = extrémité gauche, 100 % = extrémité droite.
  const progress = useMotionValue(0);
  const tipX = useTransform(progress, (p) => gaugePoint(p, 72).x);
  const tipY = useTransform(progress, (p) => gaugePoint(p, 72).y);
  useEffect(() => {
    const controls = animate(progress, pct, {
      duration: 1.1, ease: [0.22, 1, 0.36, 1], delay,
    });
    return () => controls.stop();
  }, [pct, delay, progress]);

  return (
    <div className="relative mx-auto w-[200px]">
      <svg viewBox="0 0 200 116" className="w-full h-auto overflow-visible">
        {/* Arc de fond */}
        <path d={arcPath} fill="none" strokeWidth="12" strokeLinecap="round"
          className="stroke-surface-alt dark:stroke-surface-dark-alt" />
        {/* Arc coloré animé (bleu, de la gauche vers la droite) */}
        <motion.path d={arcPath} fill="none" strokeWidth="12" strokeLinecap="round"
          className="stroke-primary-600 dark:stroke-primary-400" strokeDasharray={GAUGE_ARC}
          initial={{ strokeDashoffset: GAUGE_ARC }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }} />
        {/* Graduations */}
        {ticks.map((t) => {
          const a = gaugePoint(t, 66);
          const b = gaugePoint(t, 76);
          return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            strokeWidth="2" strokeLinecap="round"
            className="stroke-ink-subtle/50 dark:stroke-ink-dark-muted/40" />;
        })}
        {/* Aiguille : balaie de la gauche (0 %) vers la droite (100 %) */}
        <motion.line x1={100} y1={100} x2={tipX} y2={tipY}
          strokeWidth="4" strokeLinecap="round"
          className="stroke-primary-600 dark:stroke-primary-400" />
        {/* Moyeu central */}
        <circle cx="100" cy="100" r="7" className="fill-primary-600 dark:fill-primary-400" />
        <circle cx="100" cy="100" r="3" className="fill-white dark:fill-surface-dark" />
      </svg>
      <div className="-mt-2 flex flex-col items-center">
        <span className="num text-[34px] font-bold leading-none text-primary-700 dark:text-primary-300">
          {count}<span className="text-lg align-top">%</span>
        </span>
        <span className="text-[11px] font-semibold text-ink-muted dark:text-ink-dark-muted mt-1 tabular-nums">
          {placees}/{total} cours
        </span>
      </div>
    </div>
  );
}

export default function ChefDashboard() {
  const { user } = useAuthStore();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [semaine, setSemaine] = useState(null);
  const [ues, setUes]   = useState([]);
  const [ens, setEns]   = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [envois, setEnvois]     = useState(0);
  const [taux, setTaux]         = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/semaines/'),
      api.get('/mon-departement/ues/'),
      api.get('/mon-departement/enseignants/'),
      api.get('/mon-departement/filieres/'),
      api.get('/imports/mine/').catch(() => ({ data: [] })),
    ]).then(([sw, u, e, f, im]) => {
      const semaines = arr(sw);
      setSemaine(semaines.find(s => s.statut === 'IMPORTS_OUVERTS') ?? semaines[0] ?? null);
      setUes(arr(u));
      setEns(arr(e));
      setFilieres(arr(f));
      setEnvois(arr(im).length);
    }).catch(() => {});
  }, []);

  // Taux de programmation du département pour la semaine affichée (une fois
  // le planning généré ou publié). L'endpoint filtre déjà sur le département.
  useEffect(() => {
    if (!semaine || !['GENERE', 'PUBLIE'].includes(semaine.statut)) { setTaux(null); return; }
    api.get(`/semaines/${semaine.id}/taux-programmation/`)
      .then(r => setTaux((arr(r)[0]) ?? null))
      .catch(() => setTaux(null));
  }, [semaine]);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // — Données graphes —
  const uesParNiveau = NIVEAUX
    .map(n => ({ niveau: n, count: ues.filter(u => (u.filiere?.niveau ?? u.filiere_niveau) === n).length }))
    .filter(d => d.count > 0);

  const ensParGrade = Object.entries(
    ens.reduce((acc, e) => { acc[e.grade] = (acc[e.grade] || 0) + 1; return acc; }, {})
  ).map(([grade, value]) => ({ name: GRADE_LABELS[grade] ?? grade, value }));

  // — Palette recharts réactive au thème —
  const axisColor = isDark ? '#6F7787' : '#8E97A4';
  const gridColor = isDark ? '#1F2A40' : '#E5E2D8';
  const barColor  = isDark ? '#5277AE' : '#1E3A8A';
  const tooltipStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1F2A40' : '#E5E2D8'}`,
    borderRadius: 10,
    fontSize: 12,
    color: isDark ? '#E5E5DE' : '#1F2937',
    boxShadow: '0 4px 12px rgba(15,31,71,0.08)',
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="heading-display text-3xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>Tableau de bord</h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>
          {today}
          {user?.nom ? ` · ${user.prenom ?? ''} ${user.nom}`.trim() : ''}
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={BookOpen} label="Mes UEs" value={ues.length} sub="unités d'enseignement"
          to="/chef/ues" delay={0} />
        <KpiCard icon={Users} label="Mes Enseignants" value={ens.length} sub="corps enseignant"
          to="/chef/enseignants" delay={0.06} />
        <KpiCard icon={GraduationCap} label="Mes Filières" value={filieres.length} sub="classes pédagogiques"
          delay={0.12} />
        <KpiCard icon={Send} label="Mes Envois" value={envois} sub="fichiers déposés"
          to="/chef/historique-envois" delay={0.18} />
      </div>

      {/* Les 3 graphes sur une même ligne */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <ChartCard eyebrow="Répartition" title="UEs par niveau" delay={0.28}
          empty={uesParNiveau.length === 0 ? "Aucune UE enregistrée. Ajoutez-en depuis « Mes UEs »." : null}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={uesParNiveau} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="niveau" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: isDark ? 'rgba(82,119,174,0.12)' : 'rgba(30,58,138,0.06)' }}
                contentStyle={tooltipStyle} formatter={(v) => [`${v} UE${v > 1 ? 's' : ''}`, 'Total']} />
              <Bar dataKey="count" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={56} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard eyebrow="Corps enseignant" title="Enseignants par grade" delay={0.34}
          empty={ensParGrade.length === 0 ? "Aucun enseignant enregistré. Ajoutez-en depuis « Mes Enseignants »." : null}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ensParGrade} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={52} outerRadius={84} paddingAngle={3} animationDuration={900}
                label={({ name, value }) => `${name} (${value})`} labelLine={false}
                stroke={isDark ? '#111827' : '#FFFFFF'} strokeWidth={2}>
                {ensParGrade.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v, n) => [`${v} enseignant${v > 1 ? 's' : ''}`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Taux de programmation — jauge semi-circulaire à aiguille */}
        <ChartCard eyebrow="Cette semaine" title="Taux de programmation" delay={0.4}
          empty={!taux ? "Le taux s'affichera une fois le planning de la semaine généré." : null}>
          {taux && (
            <div className="flex flex-col items-center justify-center h-[220px]">
              <RadialGauge value={taux.taux} placees={taux.placees} total={taux.total} delay={0.45} />
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted text-center mt-2 px-2">
                {taux.taux >= 100
                  ? 'Tous vos cours sont programmés cette semaine.'
                  : `${taux.total - taux.placees} cours en attente de placement.`}
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Accès rapides — pleine largeur sous les graphes */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em] mb-3">Accès rapides</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <QuickAction icon={FileUp} label="Importer mes cours" to="/chef/import" description="Déposer un fichier Excel" delay={0.48} />
          <QuickAction icon={BookOpen} label="Gérer mes UEs" to="/chef/ues" description="Ajouter ou modifier vos UEs" delay={0.52} />
          <QuickAction icon={Users} label="Gérer mes enseignants" to="/chef/enseignants" description="Ajouter ou modifier le corps enseignant" delay={0.56} />
          <QuickAction icon={LayoutGrid} label="Consulter mon planning" to="/chef/planning" description="Emploi du temps du département" delay={0.6} />
        </div>
      </motion.div>

      {/* Semaine en cours — sous les graphes */}
      {semaine ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
            <div>
              <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em] mb-1.5">Semaine en cours</p>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong text-2xl">
                Du{' '}{new Date(semaine.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                {' '}au{' '}{new Date(semaine.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <Badge status={semaine.statut} />
          </div>
          {semaine.statut === 'IMPORTS_OUVERTS' && (
            <Link to="/chef/import"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
              <FileUp size={14} /> Déposer mon fichier
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card text-center text-ink-muted dark:text-ink-dark-muted text-sm">
          Aucune semaine ouverte aux imports pour le moment.
        </motion.div>
      )}
    </div>
  );
}
