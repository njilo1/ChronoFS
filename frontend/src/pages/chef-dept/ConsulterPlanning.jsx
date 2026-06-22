import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Download, Calendar } from 'lucide-react';
import api from '../../services/api';
import { fetchAll } from '../../services/fetchAll';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import PageShell from '../../components/ui/PageShell';
import { SkeletonCard } from '../../components/ui/Skeleton';

// Jours encodés par index : aligné sur le backend (0=Lundi … 5=Samedi)
const JOURS = [
  { idx: 0, label: 'Lun' },
  { idx: 1, label: 'Mar' },
  { idx: 2, label: 'Mer' },
  { idx: 3, label: 'Jeu' },
  { idx: 4, label: 'Ven' },
  { idx: 5, label: 'Sam' },
];
const CRENEAUX = [
  { debut:'07:30', fin:'10:00' },
  { debut:'10:15', fin:'12:45' },
  { debut:'13:00', fin:'15:30' },
  { debut:'15:45', fin:'18:15' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';

export default function ConsulterPlanning() {
  const [semaines, setSemaines]         = useState([]);
  const [selected, setSelected]         = useState('');
  const [seances, setSeances]           = useState([]);
  const [loadingSem, setLoadingSem]     = useState(true);
  const [loadingPlan, setLoadingPlan]   = useState(false);
  const [busy, setBusy]                 = useState(false);

  useEffect(() => {
    fetchAll('/semaines/')
      .then(list => {
        setSemaines(list);
        const courante = list.find(s => s.statut === 'PUBLIE') ?? list.find(s => s.statut === 'GENERE') ?? list[0];
        if (courante) setSelected(String(courante.id));
      })
      .finally(() => setLoadingSem(false));
  }, []);

  // L'endpoint /api/semaines/<id>/seances/ filtre déjà côté backend pour un
  // chef : il ne reçoit que les séances de son département. On récupère TOUTES
  // les pages, sinon un planning de plus de 20 séances s'afficherait tronqué.
  useEffect(() => {
    if (!selected) return;
    setLoadingPlan(true);
    fetchAll(`/semaines/${selected}/seances/`)
      .then(list => setSeances(list))
      .catch(() => setSeances([]))
      .finally(() => setLoadingPlan(false));
  }, [selected]);

  const getCell = (jourIdx, creneauIdx) =>
    seances.filter(s => s.jour === jourIdx && s.creneau === creneauIdx);

  const handleDownloadPDF = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const sem = semaines.find(s => String(s.id) === selected);
      const res = await api.post(`/semaines/${selected}/export-pdf-perso/`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `Planning_${sem?.date_debut ?? selected}.pdf`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Planning PDF téléchargé.');
    } catch (err) {
      // Réponse blob → message d'erreur encodé dans le blob JSON
      let msg = "Échec du téléchargement.";
      if (err.response?.data instanceof Blob) {
        try { msg = JSON.parse(await err.response.data.text()).detail ?? msg; } catch { /* ignore */ }
      } else {
        msg = extractApiError(err, msg);
      }
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      icon={LayoutGrid}
      title="Mon planning"
      subtitle="Emploi du temps de votre département (lecture seule)"
      action={
        <motion.button
          onClick={handleDownloadPDF} disabled={busy || !selected}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download size={13} /> {busy ? 'Export…' : 'Télécharger PDF'}
        </motion.button>
      }
    >
      {/* Sélecteur semaine */}
      <div className="bg-white border border-line rounded-xl p-4 shadow-card flex items-center gap-3">
        <Calendar size={15} className="text-primary-700 shrink-0" />
        {loadingSem ? <div className="skeleton h-5 rounded w-64" /> : (
          <select className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
            value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Sélectionner une semaine —</option>
            {semaines.map(s => (
              <option key={s.id} value={s.id}>
                {fmtDate(s.date_debut)} → {fmtDate(s.date_fin)}
                {s.annee_academique?.libelle ? ` · ${s.annee_academique.libelle}` : ''}
                {s.statut === 'PUBLIE' ? ' ✓' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grille */}
      {loadingPlan ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} height="h-20" />)}
        </div>
      ) : !selected ? null : seances.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl shadow-card py-14 text-center text-ink-muted text-sm">
          Aucun cours planifié pour cette semaine.
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle border-b border-line">
                <th className="px-3 py-3 text-left text-[11px] font-bold text-ink-muted uppercase tracking-widest w-24">Créneau</th>
                {JOURS.map(j => (
                  <th key={j.idx} className="px-3 py-3 text-center text-[11px] font-bold text-ink-muted uppercase tracking-widest">
                    {j.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRENEAUX.map((cren, ci) => (
                <tr key={ci} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2 text-ink-muted font-medium bg-surface-subtle border-r border-line whitespace-nowrap">
                    {cren.debut}<br /><span className="text-[10px] text-ink-subtle">{cren.fin}</span>
                  </td>
                  {JOURS.map(j => {
                    const cells = getCell(j.idx, ci);
                    return (
                      <td key={j.idx} className="px-2 py-1.5 align-top border-r border-line/30 last:border-0">
                        {cells.map((s, k) => (
                          <motion.div key={s.id ?? k}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (ci * 6 + j.idx) * 0.015 }}
                            className="mb-1 last:mb-0 bg-primary-50 border border-primary-200 rounded-xl p-1.5 hover:border-primary-300 hover:bg-primary-100/60 transition-colors">
                            <p className="font-bold text-primary-800 truncate leading-tight">
                              {s.ue_code ?? '—'}
                            </p>
                            <p className="text-ink-muted truncate leading-tight mt-0.5 text-[10px]">
                              {s.filiere_libelle ?? ''}
                            </p>
                            <p className="text-ink-subtle truncate leading-tight text-[10px]">
                              {s.enseignant_nom ?? '—'}
                              {s.salle_nom ? ` · ${s.salle_nom}` : ''}
                            </p>
                          </motion.div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </PageShell>
  );
}
