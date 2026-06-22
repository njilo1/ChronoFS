import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Download, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { fetchAll } from '../../services/fetchAll';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import PageShell from '../../components/ui/PageShell';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';

const fmtDt = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function HistoriqueEnvois() {
  const [imports, setImports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy]         = useState(null);

  useEffect(() => {
    fetchAll('/imports/mine/')
      .then(list => setImports(list))
      .catch(() => setImports([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (imp) => {
    setBusy(imp.id);
    try {
      const res = await api.get(`/imports/${imp.id}/fichier/`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `Import_${imp.departement_code ?? imp.id}.xlsx`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Fichier téléchargé.');
    } catch (err) {
      toast.error(extractApiError(err, 'Échec du téléchargement du fichier.'));
    } finally { setBusy(null); }
  };

  const sorted = [...imports].sort((a, b) => new Date(b.uploaded_at ?? 0) - new Date(a.uploaded_at ?? 0));

  return (
    <PageShell
      icon={History}
      title="Historique des envois"
      subtitle="Récapitulatif de tous vos fichiers déposés"
      count={loading ? null : imports.length}
    >
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <SkeletonCard key={i} height="h-16" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl shadow-card py-16 text-center text-ink-muted text-sm">
          Aucun envoi effectué pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((imp, i) => {
            const isOpen = expanded === imp.id;
            return (
              <motion.div key={imp.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.045 }}
                whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
                className="bg-white border border-line rounded-2xl shadow-card overflow-hidden hover:shadow-card-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary-50 rounded-xl shrink-0">
                      <History size={13} className="text-primary-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {imp.semaine_libelle ?? 'Semaine'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Déposé le {fmtDt(imp.uploaded_at)}
                        {imp.nb_demandes != null && ` · ${imp.nb_demandes} cours`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge status={imp.statut_parsing} />
                    <button onClick={() => handleDownload(imp)} disabled={busy === imp.id}
                      className="p-1.5 text-ink-muted hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all"
                      title="Télécharger le fichier">
                      <Download size={13} />
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : imp.id)}
                      className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-alt rounded-lg transition-all">
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-line"
                    >
                      <div className="px-5 py-4 bg-surface-subtle space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink">Cours enregistrés</span>
                          <span className="font-semibold text-success">{imp.rapport_parsing?.lignes_ok ?? imp.nb_demandes ?? 0}</span>
                        </div>
                        {(imp.rapport_parsing?.lignes_erreur ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-ink">Lignes refusées</span>
                            <span className="font-semibold text-danger">{imp.rapport_parsing.lignes_erreur}</span>
                          </div>
                        )}
                        {imp.rapport_parsing?.erreurs?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-line space-y-1">
                            {imp.rapport_parsing.erreurs.map((e, j) => (
                              <p key={j} className="text-xs text-warning">
                                &#9888; {typeof e === 'string' ? e : `Ligne ${e.ligne} : ${e.message}`}
                              </p>
                            ))}
                          </div>
                        )}
                        {(imp.rapport_parsing?.lignes_erreur ?? 0) === 0 && !imp.rapport_parsing?.erreurs?.length && (
                          <p className="text-xs text-ink-muted italic">Aucune erreur signalée lors de l'analyse.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
