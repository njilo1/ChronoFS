import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUp, BookOpen, Users, Calendar } from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';

export default function ChefDashboard() {
  const { user } = useAuthStore();
  const [semaine, setSemaine] = useState(null);
  const [stats, setStats]     = useState({ ues: 0, ens: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/semaines/'),
      api.get('/mon-departement/ues/'),
      api.get('/mon-departement/enseignants/'),
    ]).then(([sw, ues, ens]) => {
      const semaines = Array.isArray(sw.data) ? sw.data : (sw.data.results ?? []);
      const active = semaines.find(s => s.statut === 'IMPORTS_OUVERTS') ?? semaines[0];
      setSemaine(active ?? null);
      setStats({
        ues: (Array.isArray(ues.data) ? ues.data : ues.data.results ?? []).length,
        ens: (Array.isArray(ens.data) ? ens.data : ens.data.results ?? []).length,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-etext font-display text-2xl font-semibold">
          Tableau de bord
        </h1>
        <p className="text-emuted text-sm mt-1">
          Bienvenue, {user?.nom || 'Chef de département'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: BookOpen, label: 'Mes UEs',         value: stats.ues, delay: 0.05 },
          { icon: Users,    label: 'Mes Enseignants', value: stats.ens, delay: 0.10 },
        ].map(({ icon: Icon, label, value, delay }) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-ecard border border-eborder rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg"><Icon size={16} className="text-gold" /></div>
            <div>
              <p className="text-emuted text-xs uppercase tracking-wider">{label}</p>
              <p className="text-etext text-xl font-semibold font-display">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {semaine ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-ecard border border-eborder rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-emuted text-xs uppercase tracking-wider mb-1">Semaine ouverte</p>
              <h2 className="text-etext font-display text-lg font-semibold flex items-center gap-2">
                <Calendar size={15} className="text-gold" />
                Du {new Date(semaine.date_debut).toLocaleDateString('fr-FR')} au{' '}
                {new Date(semaine.date_fin).toLocaleDateString('fr-FR')}
              </h2>
            </div>
            <Badge status={semaine.statut} />
          </div>
          {semaine.statut === 'IMPORTS_OUVERTS' && (
            <Link
              to="/chef/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-ebg text-sm font-medium rounded-lg hover:bg-gold-lt transition-colors"
            >
              <FileUp size={14} /> Déposer mon fichier
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="bg-ecard border border-eborder rounded-xl p-5 text-center text-emuted text-sm">
          Aucune semaine ouverte aux imports pour le moment.
        </div>
      )}
    </div>
  );
}
