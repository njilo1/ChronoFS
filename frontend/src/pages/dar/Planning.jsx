import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import api from '../../services/api';
import GrilleEDT from '../../components/planning/GrilleEDT';
import Badge from '../../components/ui/Badge';

export default function Planning() {
  const { id } = useParams();
  const [semaine, setSemaine]   = useState(null);
  const [seances, setSeances]   = useState([]);
  const [salles, setSalles]     = useState([]);
  const [salleId, setSalleId]   = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/semaines/${id}/`),
      api.get(`/seances/?semaine=${id}`),
      api.get('/salles/'),
    ]).then(([sw, sc, sl]) => {
      setSemaine(sw.data);
      setSeances(Array.isArray(sc.data) ? sc.data : (sc.data.results ?? []));
      const sl2 = Array.isArray(sl.data) ? sl.data : (sl.data.results ?? []);
      setSalles(sl2);
    }).finally(() => setLoading(false));
  }, [id]);

  // Filtre par salle si sélectionnée, sinon toutes
  const seancesFiltrees = salleId
    ? seances.filter(s => String(s.salle?.id) === salleId)
    : seances;

  // Salles qui ont au moins une séance
  const sallesActives = salles.filter(sl =>
    seances.some(s => s.salle?.id === sl.id)
  );

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <Link to="/dar/semaines"
          className="mt-1 p-1.5 text-emuted hover:text-gold hover:bg-gold/10 rounded transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">
            Planning — Grille des séances
          </h1>
          {semaine && (
            <p className="text-emuted text-sm mt-0.5 flex items-center gap-2">
              Du {new Date(semaine.date_debut).toLocaleDateString('fr-FR')} au {new Date(semaine.date_fin).toLocaleDateString('fr-FR')}
              <Badge status={semaine.statut} />
            </p>
          )}
        </div>
      </div>

      {/* Filtre par salle */}
      {sallesActives.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-emuted" />
          <select
            value={salleId}
            onChange={e => setSalleId(e.target.value)}
            className="bg-ecard border border-eborder rounded-lg px-3 py-1.5 text-sm text-etext focus:outline-none focus:border-gold/50 transition-all"
          >
            <option value="">Toutes les salles ({seances.length} séances)</option>
            {sallesActives.map(sl => (
              <option key={sl.id} value={sl.id}>
                Salle {sl.nom} — {sl.campus?.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-emuted py-16 text-sm">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          Chargement des séances…
        </div>
      ) : seances.length === 0 ? (
        <div className="text-center py-16 text-emuted text-sm">
          Aucune séance générée pour cette semaine.
        </div>
      ) : (
        <GrilleEDT seances={seancesFiltrees} />
      )}
    </div>
  );
}
