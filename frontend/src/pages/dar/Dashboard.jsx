import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, Building2, DoorOpen, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';

function StatCard({ icon: Icon, label, value, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-ecard border border-eborder rounded-xl p-5 flex items-center gap-4"
    >
      <div className="p-2.5 bg-gold/10 rounded-lg shrink-0">
        <Icon size={18} className="text-gold" />
      </div>
      <div>
        <p className="text-emuted text-xs uppercase tracking-wider">{label}</p>
        <p className="text-etext text-xl font-semibold font-display mt-0.5">{value ?? '—'}</p>
      </div>
    </motion.div>
  );
}

export default function DarDashboard() {
  const [semaine, setSemaine] = useState(null);
  const [stats, setStats]     = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/semaines/'),
      api.get('/departements/'),
      api.get('/enseignants/'),
      api.get('/salles/'),
    ]).then(([sw, dep, ens, sal]) => {
      const semaines = Array.isArray(sw.data) ? sw.data : (sw.data.results ?? []);
      setSemaine(semaines.find(s => s.statut !== 'PUBLIE') ?? semaines[0] ?? null);
      setStats({
        semaines: semaines.length,
        deps:  (Array.isArray(dep.data) ? dep.data : dep.data.results ?? []).length,
        ens:   (Array.isArray(ens.data) ? ens.data : ens.data.results ?? []).length,
        sal:   (Array.isArray(sal.data) ? sal.data : sal.data.results ?? []).length,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-etext font-display text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-emuted text-sm mt-1">Division des Affaires Académiques — FS-UEB</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar}   label="Semaines"     value={stats.semaines} delay={0.05} />
        <StatCard icon={Building2}  label="Départements" value={stats.deps}     delay={0.10} />
        <StatCard icon={Users}      label="Enseignants"  value={stats.ens}      delay={0.15} />
        <StatCard icon={DoorOpen}   label="Salles"       value={stats.sal}      delay={0.20} />
      </div>

      {semaine && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-ecard border border-eborder rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-emuted text-xs uppercase tracking-wider mb-1">Semaine active</p>
              <h2 className="text-etext font-display text-xl font-semibold">
                Du {new Date(semaine.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}{' '}
                au {new Date(semaine.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-emuted text-sm mt-1">
                Semestre {semaine.semestre}
                {semaine.annee_academique?.libelle && ` · ${semaine.annee_academique.libelle}`}
              </p>
            </div>
            <Badge status={semaine.statut} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              to="/dar/semaines"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-ebg text-sm font-medium rounded-lg hover:bg-gold-lt transition-colors"
            >
              <Calendar size={14} />
              Gérer les semaines
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
