import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import {
  FileUp, BookOpen, Users, LayoutGrid, ChevronRight, ArrowUpRight,
  GraduationCap, Send,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Sector, LabelList,
} from 'recharts';
import api from '../../services/api';
import { fetchAll } from '../../services/fetchAll';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { staggerContainer, staggerItem } from '../../lib/motion';

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];
const GRADE_LABELS = { DR: 'Dr', PR: 'Pr', M: 'M.', MME: 'Mme', ING: 'Ing.' };
const PIE_COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#06B6D4'];

function arr(r) { return Array.isArray(r.data) ? r.data : (r.data?.results ?? []); }

/* Compteur animé (easing cubic-out). Respecte « réduire les animations ». */
function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!target) { setVal(0); return; }
    if (reduce) { setVal(target); return; }
    const t = setTimeout(() => {
      const start = Date.now();
      const dur = 900;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay, reduce]);
  return val;
}

/* Forme « active » du donut : le secteur survolé ressort + fin liseré extérieur. */
function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={3}
      />
      <Sector
        cx={cx} cy={cy} innerRadius={outerRadius + 9} outerRadius={outerRadius + 11}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35} cornerRadius={3}
      />
    </g>
  );
}

/* Carte KPI premium : cascade (staggerItem), survol = élévation + liseré or
   qui se déploie + icône réactive + flèche qui glisse (si lien). */
function KpiCard({ icon: Icon, label, value, sub, to, index }) {
  const count = useCountUp(value ?? 0, 350 + index * 90);
  const inner = (
    <div className="relative h-full bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card overflow-hidden group-hover:shadow-card-lg transition-shadow duration-300">
      <div className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/50 dark:group-hover:bg-primary-950/20 transition-colors duration-300 pointer-events-none" />
      <span className="absolute left-0 bottom-0 h-[2px] w-0 bg-gold-400 group-hover:w-full transition-all duration-500 ease-out pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Icon size={15} className="text-white" />
        </div>
        {to && (
          <ArrowUpRight
            size={12}
            className="text-ink-subtle mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:-translate-y-0.5 transition-all duration-300"
          />
        )}
      </div>
      <p className="num text-[34px] font-bold text-ink-strong dark:text-ink-dark-strong leading-none tracking-tight">{count}</p>
      <p className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-subtle mt-0.5">{sub}</p>}
    </div>
  );
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group cursor-default"
    >
      {to ? <Link to={to} className="block h-full">{inner}</Link> : inner}
    </motion.div>
  );
}

function ChartCard({ eyebrow, title, children, empty }) {
  return (
    <motion.div
      variants={staggerItem}
      className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card hover:shadow-card-md transition-shadow duration-300"
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

function QuickAction({ icon: Icon, label, to, description }) {
  return (
    <motion.div variants={staggerItem}>
      <Link to={to}
        className="flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-xl hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 hover:shadow-card-md transition-all group shadow-card">
        <div className="p-2 bg-primary-50 dark:bg-primary-950/40 group-hover:bg-primary-100 rounded-lg transition-all duration-300 shrink-0 group-hover:scale-110">
          <Icon size={15} className="text-primary-700 dark:text-primary-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink dark:text-ink-dark group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">{label}</p>
          {description && <p className="text-xs text-ink-muted dark:text-ink-dark-muted truncate">{description}</p>}
        </div>
        <ChevronRight size={13} className="ml-auto text-ink-subtle group-hover:text-primary-500 shrink-0 transition-all duration-200 group-hover:translate-x-0.5" />
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
  const [barHover, setBarHover] = useState(null); // barre survolée (focus)
  const [gradeIdx, setGradeIdx] = useState(-1);   // secteur survolé du donut (-1 = aucun)

  useEffect(() => {
    Promise.all([
      fetchAll('/semaines/'),
      fetchAll('/mon-departement/ues/'),
      fetchAll('/mon-departement/enseignants/'),
      fetchAll('/mon-departement/filieres/'),
      fetchAll('/imports/mine/').catch(() => []),
    ]).then(([semaines, u, e, f, im]) => {
      setSemaine(semaines.find(s => s.statut === 'IMPORTS_OUVERTS') ?? semaines[0] ?? null);
      setUes(u);
      setEns(e);
      setFilieres(f);
      setEnvois(im.length);
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
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header éditorial */}
      <motion.div variants={staggerItem}>
        <p className="eyebrow mb-1.5">Chef de Département · FS-UEB</p>
        <h1 className="heading-display text-3xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>
          Tableau de <em>bord</em>
        </h1>
        <p className="text-sm mt-1 capitalize" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>
          {today}
          {user?.nom ? ` · ${user.prenom ?? ''} ${user.nom}`.trim() : ''}
        </p>
      </motion.div>

      {/* KPI Cards — cascade imbriquée */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={staggerContainer}>
        <KpiCard icon={BookOpen} label="Mes UEs" value={ues.length} sub="unités d'enseignement"
          to="/chef/ues" index={0} />
        <KpiCard icon={Users} label="Mes Enseignants" value={ens.length} sub="corps enseignant"
          to="/chef/enseignants" index={1} />
        <KpiCard icon={GraduationCap} label="Mes Filières" value={filieres.length} sub="classes pédagogiques"
          index={2} />
        <KpiCard icon={Send} label="Mes Envois" value={envois} sub="fichiers déposés"
          to="/chef/historique-envois" index={3} />
      </motion.div>

      {/* Les 3 graphes sur une même ligne */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch" variants={staggerContainer}>
        <ChartCard eyebrow="Répartition" title="UEs par niveau"
          empty={uesParNiveau.length === 0 ? "Aucune UE enregistrée. Ajoutez-en depuis « Mes UEs »." : null}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={uesParNiveau} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="niveau" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: isDark ? 'rgba(82,119,174,0.12)' : 'rgba(30,58,138,0.06)' }}
                contentStyle={tooltipStyle} formatter={(v) => [`${v} UE${v > 1 ? 's' : ''}`, 'Total']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}
                animationBegin={250} animationDuration={1100} animationEasing="ease-out"
                onMouseEnter={(_, i) => setBarHover(i)} onMouseLeave={() => setBarHover(null)}>
                {uesParNiveau.map((_, i) => (
                  <Cell key={i} fill={barColor}
                    fillOpacity={barHover === null || barHover === i ? 1 : 0.32}
                    style={{ transition: 'fill-opacity 0.25s ease' }} />
                ))}
                <LabelList dataKey="count" position="top"
                  style={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard eyebrow="Corps enseignant" title="Enseignants par grade"
          empty={ensParGrade.length === 0 ? "Aucun enseignant enregistré. Ajoutez-en depuis « Mes Enseignants »." : null}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart onMouseLeave={() => setGradeIdx(-1)}>
              <Pie data={ensParGrade} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={52} outerRadius={84} paddingAngle={3} cornerRadius={3}
                animationBegin={200} animationDuration={1000} animationEasing="ease-out"
                label={({ name, value }) => `${name} (${value})`} labelLine={false}
                stroke={isDark ? '#111827' : '#FFFFFF'} strokeWidth={2}
                activeIndex={gradeIdx} activeShape={renderActiveShape}
                onMouseEnter={(_, i) => setGradeIdx(i)}>
                {ensParGrade.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v, n) => [`${v} enseignant${v > 1 ? 's' : ''}`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Taux de programmation — jauge semi-circulaire à aiguille */}
        <ChartCard eyebrow="Cette semaine" title="Taux de programmation"
          empty={!taux ? "Le taux s'affichera une fois le planning de la semaine généré." : null}>
          {taux && (
            <div className="flex flex-col items-center justify-center h-[220px]">
              <RadialGauge value={taux.taux} placees={taux.placees} total={taux.total} delay={0.35} />
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted text-center mt-2 px-2">
                {taux.taux >= 100
                  ? 'Tous vos cours sont programmés cette semaine.'
                  : `${taux.total - taux.placees} cours en attente de placement.`}
              </p>
            </div>
          )}
        </ChartCard>
      </motion.div>

      {/* Accès rapides — pleine largeur sous les graphes */}
      <motion.div variants={staggerItem}>
        <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-[0.22em] mb-3">Accès rapides</p>
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" variants={staggerContainer}>
          <QuickAction icon={FileUp} label="Importer mes cours" to="/chef/import" description="Déposer un fichier Excel" />
          <QuickAction icon={BookOpen} label="Gérer mes UEs" to="/chef/ues" description="Ajouter ou modifier vos UEs" />
          <QuickAction icon={Users} label="Gérer mes enseignants" to="/chef/enseignants" description="Ajouter ou modifier le corps enseignant" />
          <QuickAction icon={LayoutGrid} label="Consulter mon planning" to="/chef/planning" description="Emploi du temps du département" />
        </motion.div>
      </motion.div>

      {/* Semaine en cours — sous les graphes */}
      {semaine ? (
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="group bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card hover:shadow-card-md transition-shadow duration-300">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
            <div>
              <p className="eyebrow mb-1.5">Semaine en cours</p>
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
              <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div variants={staggerItem}
          className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card text-center text-ink-muted dark:text-ink-dark-muted text-sm">
          Aucune semaine ouverte aux imports pour le moment.
        </motion.div>
      )}
    </motion.div>
  );
}
