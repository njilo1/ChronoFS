import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Calendar, Users, Building2, DoorOpen, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector, LabelList,
} from 'recharts';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import useThemeStore from '../../store/themeStore';
import { staggerContainer, staggerItem } from '../../lib/motion';

/* Compteur animé (easing cubic-out). Respecte la préférence « réduire les
   animations » : affiche alors directement la valeur finale. */
function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!target) { setVal(0); return; }
    if (reduce) { setVal(target); return; }
    const t = setTimeout(() => {
      const start = Date.now();
      const dur = 1000;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay, reduce]);
  return val;
}

// Palette bleutée pour les anneaux (un anneau = un département).
const DEPT_COLORS = ['#1E3A8A', '#1D4ED8', '#3B82F6', '#0EA5E9', '#06B6D4', '#0891B2', '#2563EB', '#60A5FA'];

/* Forme « active » du donut : le secteur survolé ressort (rayon agrandi) et
   un fin liseré apparaît à l'extérieur → effet de profondeur premium. */
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

// Infobulle du graphe circulaire : taux + cours placés du département survolé.
function OccupationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-line rounded-xl px-3.5 py-2.5 shadow-card-md text-xs"
    >
      <p className="font-bold text-ink mb-1">{d.nom}</p>
      <p className="text-ink-muted">
        Taux&ensp;<span className="num font-bold text-ink">{d.taux}%</span>
        <span className="text-ink-subtle"> · {d.placees}/{d.total} cours</span>
      </p>
    </motion.div>
  );
}

/* Carte KPI premium : entrée en cascade (staggerItem), survol = élévation +
   liseré or qui se déploie + icône qui s'anime + flèche qui glisse. */
function KpiCard({ icon: Icon, label, value, sub, index }) {
  const count = useCountUp(value ?? 0, 350 + index * 90);
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative bg-white border border-line rounded-2xl p-5 shadow-card cursor-default overflow-hidden hover:shadow-card-lg transition-shadow duration-300"
    >
      {/* Voile navy très doux au survol (pas de gradient coloré) */}
      <div className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/60 transition-colors duration-300 pointer-events-none" />
      {/* Liseré or qui se déploie en bas de la carte */}
      <span className="absolute left-0 bottom-0 h-[2px] w-0 bg-gold-400 group-hover:w-full transition-all duration-500 ease-out pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Icon size={15} className="text-white" />
        </div>
        <ArrowUpRight
          size={12}
          className="text-ink-subtle mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:-translate-y-0.5 transition-all duration-300"
        />
      </div>
      <p className="num text-[34px] font-bold text-ink-strong leading-none tracking-tight">{count}</p>
      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-subtle mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const pct = payload[0]?.payload?.pct;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-line rounded-xl px-3.5 py-2.5 shadow-card-md text-xs"
    >
      <p className="font-bold text-ink mb-1.5">{label ?? payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-ink-muted">
          {p.name}&ensp;<span className="num font-bold text-ink">{p.value}</span>
          {pct != null && <span className="text-ink-subtle"> ({pct}%)</span>}
        </p>
      ))}
    </motion.div>
  );
}

export default function DarDashboard() {
  const [stats, setStats]           = useState({ semaines: 0, deps: 0, ens: 0, sal: 0 });
  const [semaine, setSemaine]       = useState(null);
  const [sallesChart, setSallesChart]   = useState([]);
  const [taux, setTaux]             = useState(null);
  const [activeIdx, setActiveIdx]   = useState(-1);  // secteur survolé du donut (-1 = aucun)
  const [barHover, setBarHover]     = useState(null); // barre survolée (focus)
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const arr = (r) => Array.isArray(r.data) ? r.data : (r.data.results ?? []);

  // % global affiché au centre du donut, animé en compteur.
  const globalCount = useCountUp(taux?.global ?? 0, 500);

  // Récupère TOUTES les pages d'un endpoint paginé (DRF pagine à 20 par
  // défaut). Sans cela, les compteurs et graphes plafonnaient à 20 et ne
  // reflétaient pas l'état réel de la base.
  const fetchAll = async (endpoint) => {
    let all = [];
    let page = 1;
    for (;;) {
      const res = await api.get(endpoint, { params: { page, page_size: 500 } });
      if (Array.isArray(res.data)) return res.data;
      all = all.concat(res.data.results ?? []);
      if (!res.data.next) break;
      page += 1;
    }
    return all;
  };

  useEffect(() => {
    Promise.all([
      fetchAll('/semaines/'),
      fetchAll('/departements/'),
      fetchAll('/enseignants/'),
      fetchAll('/salles/'),
    ]).then(([semaines, deps, enss, salData]) => {

      setSemaine(
        semaines.find(s => s.statut === 'IMPORTS_OUVERTS')
        ?? semaines.find(s => !['PUBLIE','ARCHIVE'].includes(s.statut))
        ?? semaines[0]
        ?? null
      );
      setStats({
        semaines: semaines.length,
        deps:     deps.length,
        ens:      enss.length,
        sal:      salData.length,
      });

      // Salles par campus
      const byCampus = {};
      for (const s of salData) {
        const k = (s.campus?.nom ?? 'Autre').replace('Campus ', '').replace(' FS', '');
        if (!byCampus[k]) byCampus[k] = { campus: k, salles: 0, places: 0 };
        byCampus[k].salles++;
        byCampus[k].places += s.capacite ?? 0;
      }
      setSallesChart(Object.values(byCampus));
    }).catch(() => {});
  }, []);

  // Taux d'occupation par département. L'endpoint renvoie une ligne par
  // département : chaque ligne devient un anneau du graphe circulaire, et on
  // garde l'agrégat global pour le centre + la légende.
  useEffect(() => {
    if (!semaine || !['GENERE', 'PUBLIE'].includes(semaine.statut)) { setTaux(null); return; }
    api.get(`/semaines/${semaine.id}/taux-programmation/`)
      .then(r => {
        const lignes = arr(r);
        if (!lignes.length) { setTaux(null); return; }
        const total   = lignes.reduce((a, d) => a + (d.total ?? 0), 0);
        const placees = lignes.reduce((a, d) => a + (d.placees ?? 0), 0);
        const complets = lignes.filter(d => (d.taux ?? 0) >= 100).length;
        // Taux décroissant : l'anneau le mieux rempli en premier.
        const depts = [...lignes]
          .sort((a, b) => (b.taux ?? 0) - (a.taux ?? 0))
          .map((d, i) => ({
            name: d.code, nom: d.nom,
            taux: d.taux ?? 0, placees: d.placees ?? 0, total: d.total ?? 0,
            fill: DEPT_COLORS[i % DEPT_COLORS.length],
          }));
        setTaux({
          global: total ? Math.round((placees / total) * 100) : 0,
          placees, total, complets, nbDepts: lignes.length, depts,
        });
      })
      .catch(() => setTaux(null));
  }, [semaine]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header éditorial */}
      <motion.div variants={staggerItem}>
        <p className="eyebrow mb-1.5">Division des Affaires Académiques · FS-UEB</p>
        <h1 className="heading-display text-3xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>
          Tableau de <em>bord</em>
        </h1>
        <p className="text-sm mt-1 capitalize" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>
          {today}
        </p>
      </motion.div>

      {/* KPI Grid — cascade imbriquée (le conteneur orchestre, les cartes entrent une à une) */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={staggerContainer}>
        <KpiCard icon={Calendar}  label="Semaines"     value={stats.semaines} sub="dans le système"  index={0} />
        <KpiCard icon={Building2} label="Départements" value={stats.deps}     sub="de la faculté"    index={1} />
        <KpiCard icon={Users}     label="Enseignants"  value={stats.ens}      sub="corps enseignant" index={2} />
        <KpiCard icon={DoorOpen}  label="Salles"       value={stats.sal}      sub="répertoriées"     index={3} />
      </motion.div>

      {/* Charts */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" variants={staggerItem}>
        {/* Bar chart — salles par campus */}
        <div className="lg:col-span-3 bg-white border border-line rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <p className="text-sm font-bold text-ink">Capacité d'accueil par campus</p>
            <p className="text-xs text-ink-muted mt-0.5">Nombre total de places par site</p>
          </div>
          {sallesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sallesChart} barSize={42} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="campus" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#EFF6FF', radius: 4 }} />
                <Bar
                  dataKey="places" name="Places" radius={[6, 6, 0, 0]}
                  animationBegin={250} animationDuration={1100} animationEasing="ease-out"
                  onMouseEnter={(_, i) => setBarHover(i)}
                  onMouseLeave={() => setBarHover(null)}
                >
                  {sallesChart.map((_, i) => (
                    <Cell
                      key={i}
                      fill="#1E3A8A"
                      fillOpacity={barHover === null || barHover === i ? 1 : 0.32}
                      style={{ transition: 'fill-opacity 0.25s ease' }}
                    />
                  ))}
                  <LabelList
                    dataKey="places" position="top"
                    style={{ fill: '#5B6573', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-ink-subtle text-xs">
              Aucune salle enregistrée
            </div>
          )}
        </div>

        {/* Graphe circulaire — taux d'occupation par département */}
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-5 shadow-card">
          <div className="mb-2">
            <p className="text-sm font-bold text-ink">Taux d'occupation par département</p>
            <p className="text-xs text-ink-muted mt-0.5">Cours placés par département · cette semaine</p>
          </div>
          {taux ? (
            <>
              <div className="relative h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart onMouseLeave={() => setActiveIdx(-1)}>
                    <Pie
                      data={taux.depts} dataKey="placees" nameKey="name" cx="50%" cy="50%"
                      innerRadius={58} outerRadius={86} paddingAngle={3} cornerRadius={3}
                      animationBegin={200} animationDuration={1000} animationEasing="ease-out"
                      label={({ name }) => name} labelLine={false}
                      stroke="#FFFFFF" strokeWidth={2}
                      activeIndex={activeIdx} activeShape={renderActiveShape}
                      onMouseEnter={(_, i) => setActiveIdx(i)}
                    >
                      {taux.depts.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<OccupationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Taux global affiché au centre de l'anneau, en compteur animé */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="num text-3xl font-bold text-primary-700 leading-none">{globalCount}%</span>
                  <span className="text-[10px] text-ink-muted uppercase tracking-[0.18em] mt-1">global</span>
                </div>
              </div>
              <p className="text-xs text-ink-muted text-center mt-1">
                <span className="num font-bold text-ink">{taux.complets}</span>/{taux.nbDepts} départements complets
              </p>
            </>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-ink-subtle text-xs text-center px-4">
              Le taux s'affichera une fois le planning de la semaine généré.
            </div>
          )}
        </div>
      </motion.div>

      {/* Semaine active */}
      {semaine && (
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="group bg-white border border-line rounded-2xl p-6 shadow-card hover:shadow-card-md transition-shadow duration-300"
        >
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="eyebrow mb-2">Semaine en cours</p>
              <h2 className="heading-display text-2xl text-ink-strong">
                Du{' '}
                {new Date(semaine.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                {' '}au{' '}
                {new Date(semaine.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-ink-muted text-sm mt-1">
                {semaine.annee_academique?.libelle && `Année ${semaine.annee_academique.libelle} · `}
                Semestre {semaine.semestre}
              </p>
            </div>
            <Badge status={semaine.statut} />
          </div>
          <Link
            to="/dar/semaines"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Calendar size={14} /> Gérer les semaines
            <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
