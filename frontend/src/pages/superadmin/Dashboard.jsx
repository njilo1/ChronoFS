import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users, SlidersHorizontal, Cpu, GraduationCap,
  Target, Lock, ArrowUpRight, Clock, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList,
} from 'recharts';
import api from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { staggerContainer, staggerItem } from '../../lib/motion';

function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!target) { setVal(0); return; }
    if (reduce) { setVal(target); return; }
    const t = setTimeout(() => {
      const start = Date.now(), dur = 1000;
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

function KpiCard({ icon: Icon, label, value, sub, index }) {
  const count = useCountUp(value ?? 0, 350 + index * 90);
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card cursor-default overflow-hidden hover:shadow-card-lg transition-shadow duration-300"
    >
      <div className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/60 dark:group-hover:bg-primary-950/20 transition-colors duration-300 pointer-events-none" />
      <span className="absolute left-0 bottom-0 h-[2px] w-0 bg-gold-400 group-hover:w-full transition-all duration-500 ease-out pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <Icon size={15} className="text-white" />
        </div>
        <ArrowUpRight size={12} className="text-ink-subtle mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:-translate-y-0.5 transition-all duration-300" />
      </div>
      <p className="num text-[34px] font-bold text-ink-strong dark:text-ink-dark-strong leading-none tracking-tight">{count}</p>
      <p className="text-[11px] font-bold text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mt-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-subtle dark:text-ink-dark-subtle mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-xl px-3.5 py-2.5 shadow-card-md text-xs">
      <p className="font-bold text-ink dark:text-ink-dark mb-1.5">{label ?? payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-ink-muted dark:text-ink-dark-muted">
          {p.name}&ensp;<span className="num font-bold text-ink dark:text-ink-dark">{p.value}</span>
        </p>
      ))}
    </motion.div>
  );
}

const STATUT_TONE = { OPTIMAL: '#0F6B45', FEASIBLE: '#0369A1', INFEASIBLE: '#B91C1C', INTERROMPU: '#B45309' };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => {
    api.get('/stats-superadmin/').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const gridColor  = isDark ? '#1F2A40' : '#E5E7EB';
  const axisColor  = isDark ? '#6F7787' : '#6B7280';
  const barColor   = isDark ? '#3A5FAF' : '#143894';
  const cursorFill = isDark ? 'rgba(58,95,175,0.12)' : '#EFF6FF';
  const labelColor = isDark ? '#A1A6B0' : '#667085';

  const ens = stats?.enseignants ?? { total: 0, permanents: 0, vacataires: 0 };
  const comptes = stats?.comptes ?? { total: 0, dar: 0, chefs: 0, superadmins: 0 };
  const regles = stats?.regles ?? { total: 0, actives: 0, statiques: 0, dynamiques: 0 };
  const gens = stats?.generations ?? { total: 0, serie: [], duree_moy_ms: 0, taux_moy: 0, dernier_statut: null };

  const donutData = [
    { name: 'Permanents', value: ens.permanents, fill: '#143894' },
    { name: 'Vacataires', value: ens.vacataires, fill: '#C8A15A' },
  ];
  const roleData = [
    { role: 'DAR', n: comptes.dar },
    { role: 'Chefs', n: comptes.chefs },
    { role: 'Super-admins', n: comptes.superadmins },
  ];

  const tauxGlobal = useCountUp(Math.round(gens.taux_moy ?? 0), 500);
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={staggerItem}>
        <p className="eyebrow mb-1.5">Super-administration · FS-UEB</p>
        <h1 className="heading-display text-3xl" style={{ color: isDark ? '#F5F4EE' : '#1C2333' }}>
          Tableau de <em>bord</em>
        </h1>
        <p className="text-sm mt-1 capitalize" style={{ color: isDark ? '#A1A6B0' : '#667085' }}>{today}</p>
      </motion.div>

      {/* KPIs */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={staggerContainer}>
        <KpiCard icon={Users}            label="Comptes"       value={comptes.total} sub={`${comptes.chefs} chefs · ${comptes.dar} DAR`} index={0} />
        <KpiCard icon={GraduationCap}    label="Enseignants"   value={ens.total}     sub={`${ens.vacataires} vacataires`} index={1} />
        <KpiCard icon={SlidersHorizontal} label="Règles actives" value={regles.actives} sub={`sur ${regles.total} au total`} index={2} />
        <KpiCard icon={Cpu}              label="Générations"   value={gens.total}    sub={`${Math.round(gens.duree_moy_ms / 1000) || 0}s en moyenne`} index={3} />
      </motion.div>

      {/* Rangée graphes 1 : taux de réussite (aire) + donut permanents/vacataires */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" variants={staggerItem}>
        <div className="lg:col-span-3 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink dark:text-ink-dark">Taux de réussite des générations</p>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">Part des cours placés, au fil du temps</p>
            </div>
            <div className="text-right">
              <p className="num text-2xl font-bold text-primary-700 dark:text-primary-300 leading-none">{tauxGlobal}%</p>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted uppercase tracking-widest mt-0.5">moyenne</p>
            </div>
          </div>
          {gens.serie.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={gens.serie} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tauxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={barColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={barColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: barColor, strokeOpacity: 0.3 }} />
                <Area type="monotone" dataKey="taux" name="Taux" stroke={barColor} strokeWidth={2}
                  fill="url(#tauxGrad)" animationDuration={1100} animationEasing="ease-out" dot={{ r: 2, fill: barColor }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[230px] flex items-center justify-center text-ink-subtle dark:text-ink-dark-subtle text-xs text-center px-4">
              L'historique s'affichera après les premières générations.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <div className="mb-2">
            <p className="text-sm font-bold text-ink dark:text-ink-dark">Corps enseignant</p>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">Permanents vs vacataires (prioritaires)</p>
          </div>
          {ens.total > 0 ? (
            <div className="relative h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={56} outerRadius={84} paddingAngle={3} cornerRadius={3}
                    stroke={isDark ? '#111827' : '#FFFFFF'} strokeWidth={2}
                    animationBegin={200} animationDuration={1000} animationEasing="ease-out">
                    {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="num text-2xl font-bold text-primary-700 dark:text-primary-300 leading-none">{ens.total}</span>
                <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted uppercase tracking-[0.18em] mt-1">enseignants</span>
              </div>
            </div>
          ) : (
            <div className="h-[210px] flex items-center justify-center text-ink-subtle dark:text-ink-dark-subtle text-xs">Aucun enseignant.</div>
          )}
        </div>
      </motion.div>

      {/* Rangée 2 : comptes par rôle + cascade des objectifs */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" variants={staggerItem}>
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <p className="text-sm font-bold text-ink dark:text-ink-dark mb-4">Comptes par rôle</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roleData} barSize={40} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="role" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: cursorFill, radius: 4 }} />
              <Bar dataKey="n" name="Comptes" radius={[6, 6, 0, 0]} fill={barColor}
                animationBegin={250} animationDuration={1000} animationEasing="ease-out">
                <LabelList dataKey="n" position="top" style={{ fill: labelColor, fontSize: 11, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-primary-700 dark:text-gold-400" />
            <p className="text-sm font-bold text-ink dark:text-ink-dark">Cascade des objectifs</p>
            <span className="text-[11px] text-ink-subtle dark:text-ink-dark-subtle ml-auto">1 = priorité maximale</span>
          </div>
          <div className="space-y-2">
            {(stats?.objectifs ?? []).map((o, i) => (
              <motion.div key={o.code}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-alt dark:bg-surface-dark-alt border border-line dark:border-line-dark">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-900 dark:bg-gold-500 text-white dark:text-page-dark text-[11px] font-bold num shrink-0">{o.priorite}</span>
                <span className="text-sm text-ink dark:text-ink-dark flex-1 truncate">{o.nom}</span>
                {o.verrouillee && <Lock size={11} className="text-gold-600 dark:text-gold-400 shrink-0" />}
                <span className={`w-2 h-2 rounded-full shrink-0 ${o.actif ? 'bg-success' : 'bg-line-strong dark:bg-line-dark-strong'}`} title={o.actif ? 'Actif' : 'Inactif'} />
              </motion.div>
            ))}
            {(stats?.objectifs ?? []).length === 0 && (
              <p className="text-xs text-ink-subtle dark:text-ink-dark-subtle py-6 text-center">Aucun objectif configuré.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bandeau état solveur */}
      <motion.div variants={staggerItem}
        className="flex items-center gap-4 flex-wrap bg-white dark:bg-surface-dark border border-line dark:border-line-dark rounded-2xl px-5 py-4 shadow-card">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-primary-700 dark:text-gold-400" />
          <span className="text-sm font-bold text-ink dark:text-ink-dark">État du solveur</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUT_TONE[gens.dernier_statut] ?? '#667085' }} />
          Dernier statut : <span className="font-semibold text-ink dark:text-ink-dark">{gens.dernier_statut ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">
          <Clock size={12} /> Durée moyenne : <span className="num font-semibold text-ink dark:text-ink-dark">{((gens.duree_moy_ms ?? 0) / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-dark-muted ml-auto">
          <SlidersHorizontal size={12} /> {regles.statiques} statiques · {regles.dynamiques} dynamiques
        </div>
      </motion.div>
    </motion.div>
  );
}
