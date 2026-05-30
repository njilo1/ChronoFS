import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Building2, DoorOpen, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, Legend, Cell,
} from 'recharts';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import useThemeStore from '../../store/themeStore';

function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => {
      const start = Date.now();
      const dur = 900;
      const tick = () => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return val;
}

// Palette bleutée pour les anneaux (un anneau = un département).
const DEPT_COLORS = ['#1E3A8A', '#1D4ED8', '#3B82F6', '#0EA5E9', '#06B6D4', '#0891B2', '#2563EB', '#60A5FA'];

// Infobulle du graphe circulaire : taux + cours placés du département survolé.
function OccupationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-line rounded-xl px-3.5 py-2.5 shadow-card-md text-xs">
      <p className="font-bold text-ink mb-1">{d.nom}</p>
      <p className="text-ink-muted">
        Taux&ensp;<span className="font-bold text-ink">{d.taux}%</span>
        <span className="text-ink-subtle"> · {d.placees}/{d.total} cours</span>
      </p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, delay }) {
  const count = useCountUp(value ?? 0, delay * 1000 + 300);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(30,58,138,0.14)' }}
      className="bg-white border border-line rounded-2xl p-5 shadow-card cursor-default overflow-hidden relative group"
    >
      <div className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/60 transition-colors duration-300 pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm">
          <Icon size={15} className="text-white" />
        </div>
        <ArrowUpRight size={11} className="text-ink-subtle mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[32px] font-bold text-ink-strong leading-none tracking-tight">{count}</p>
      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-subtle mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  // Pour le donut, chaque point porte son pourcentage dans payload.pct.
  const pct = payload[0]?.payload?.pct;
  return (
    <div className="bg-white border border-line rounded-xl px-3.5 py-2.5 shadow-card-md text-xs">
      <p className="font-bold text-ink mb-1.5">{label ?? payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-ink-muted">
          {p.name}&ensp;<span className="font-bold text-ink">{p.value}</span>
          {pct != null && <span className="text-ink-subtle"> ({pct}%)</span>}
        </p>
      ))}
    </div>
  );
}

export default function DarDashboard() {
  const [stats, setStats]           = useState({ semaines: 0, deps: 0, ens: 0, sal: 0 });
  const [semaine, setSemaine]       = useState(null);
  const [sallesChart, setSallesChart]   = useState([]);
  const [taux, setTaux]             = useState(null);
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const arr = (r) => Array.isArray(r.data) ? r.data : (r.data.results ?? []);

  useEffect(() => {
    Promise.all([
      api.get('/semaines/'),
      api.get('/departements/'),
      api.get('/enseignants/'),
      api.get('/salles/'),
    ]).then(([sw, dep, ens, sal]) => {
      const semaines = arr(sw);
      const salData  = arr(sal);

      setSemaine(
        semaines.find(s => s.statut === 'IMPORTS_OUVERTS')
        ?? semaines.find(s => !['PUBLIE','ARCHIVE'].includes(s.statut))
        ?? semaines[0]
        ?? null
      );
      setStats({
        semaines: semaines.length,
        deps:     arr(dep).length,
        ens:      arr(ens).length,
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-bold text-2xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>Tableau de bord</h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>
          {today} &middot; Division des Affaires Académiques — FS-UEB
        </p>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Calendar}  label="Semaines"     value={stats.semaines} sub="dans le système"  delay={0} />
        <KpiCard icon={Building2} label="Départements" value={stats.deps}     sub="de la faculté"    delay={0.06} />
        <KpiCard icon={Users}     label="Enseignants"  value={stats.ens}      sub="corps enseignant" delay={0.12} />
        <KpiCard icon={DoorOpen}  label="Salles"       value={stats.sal}      sub="répertoriées"     delay={0.18} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart — salles par campus */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="lg:col-span-3 bg-white border border-line rounded-2xl p-5 shadow-card"
        >
          <div className="mb-4">
            <p className="text-sm font-bold text-ink">Capacité d'accueil par campus</p>
            <p className="text-xs text-ink-muted mt-0.5">Nombre total de places par site</p>
          </div>
          {sallesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sallesChart} barSize={40} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="campus" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#EFF6FF', radius: 4 }} />
                <Bar dataKey="places" name="Places" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-ink-subtle text-xs">
              Aucune salle enregistrée
            </div>
          )}
        </motion.div>

        {/* Graphe circulaire — taux d'occupation par département */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="lg:col-span-2 bg-white border border-line rounded-2xl p-5 shadow-card"
        >
          <div className="mb-2">
            <p className="text-sm font-bold text-ink">Taux d'occupation par département</p>
            <p className="text-xs text-ink-muted mt-0.5">Un anneau par département · cette semaine</p>
          </div>
          {taux ? (
            <>
              {/* La carte garde une zone de 240 px ; le graphe est dessiné ×2
                  par-dessus (overflow visible) pour un cercle plus grand. */}
              <div className="relative h-[240px]">
                <div className="absolute inset-0 origin-center scale-[2]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      data={taux.depts}
                      innerRadius="32%" outerRadius="100%"
                      startAngle={90} endAngle={-270} barSize={11}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background={{ fill: '#EEF1F6' }} dataKey="taux" cornerRadius={6}>
                        {taux.depts.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </RadialBar>
                      <Tooltip content={<OccupationTooltip />} />
                      <Legend
                        iconType="circle" iconSize={6} layout="vertical" align="right" verticalAlign="middle"
                        wrapperStyle={{ fontSize: '6px' }}
                        formatter={(v, entry) => (
                          <span style={{ color: '#6B7280', fontWeight: 600 }}>
                            {v} <span style={{ color: '#9CA3AF' }}>· {entry?.payload?.taux ?? 0}%</span>
                          </span>
                        )}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-xs text-ink-muted text-center mt-1">
                <span className="font-bold text-primary-700">{taux.global}%</span> global ·{' '}
                {taux.complets}/{taux.nbDepts} départements complets
              </p>
            </>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-ink-subtle text-xs text-center px-4">
              Le taux s'affichera une fois le planning de la semaine généré.
            </div>
          )}
        </motion.div>
      </div>

      {/* Semaine active */}
      {semaine && (
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
          className="bg-white border border-line rounded-2xl p-6 shadow-card"
        >
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-2">Semaine en cours</p>
              <h2 className="text-ink-strong font-bold text-xl">
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
            <Calendar size={14} /> Gérer les semaines <ChevronRight size={13} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
