import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Upload, RefreshCw, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import useThemeStore from '../../store/themeStore';

const fmtDt = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';

const STATUS_CONFIG = {
  OK:           { icon: CheckCircle,  color: 'text-success',  bg: 'bg-success/10 border-success/25',   label: 'Reçu' },
  AVEC_ERREURS: { icon: AlertCircle,  color: 'text-warning',  bg: 'bg-warning/10 border-warning/25',   label: 'Avec erreurs' },
  ECHEC:        { icon: XCircle,      color: 'text-danger',   bg: 'bg-danger/10 border-danger/25',     label: 'Échec' },
  EN_ATTENTE:   { icon: Clock,        color: 'text-ink-muted', bg: 'bg-surface-alt border-line',       label: 'En attente' },
  EN_COURS:     { icon: RefreshCw,    color: 'text-primary-700', bg: 'bg-primary-50 border-primary-200', label: 'En cours' },
};

export default function Imports() {
  const [semaines, setSemaines]   = useState([]);
  const [selected, setSelected]  = useState('');
  const [imports, setImports]    = useState([]);
  const [loadingSem, setLoadingSem] = useState(true);
  const [loadingImp, setLoadingImp] = useState(false);
  const [busy, setBusy]          = useState(null);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => {
    api.get('/semaines/')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.results ?? []);
        const sorted = [...list].sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
        setSemaines(sorted);
        const active = sorted.find(s => s.statut === 'IMPORTS_OUVERTS') ?? sorted[0];
        if (active) setSelected(String(active.id));
      })
      .finally(() => setLoadingSem(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingImp(true);
    api.get('/imports/', { params: { semaine: selected } })
      .then(r => setImports(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
      .catch(() => setImports([]))
      .finally(() => setLoadingImp(false));
  }, [selected]);

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
    } catch (err) {
      toast.error(extractApiError(err, 'Échec du téléchargement du fichier.'));
    } finally { setBusy(null); }
  };

  const recu    = imports.filter(i => i.statut_parsing === 'OK' || i.statut_parsing === 'AVEC_ERREURS');
  const total   = imports.length;
  const semaine = semaines.find(s => String(s.id) === selected);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary-900 shadow-sm">
            <Upload size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-2xl" style={{ color: isDark ? '#F5F4EE' : '#0B1220' }}>Suivi des imports</h1>
            <p className="text-sm mt-0.5" style={{ color: isDark ? '#A1A6B0' : '#5B6573' }}>Fichiers déposés par les chefs de département</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Button variant="secondary" size="sm" onClick={() => { const cur = selected; setSelected(''); setTimeout(() => setSelected(cur), 50); }}>
            <RefreshCw size={13} /> Rafraîchir
          </Button>
        </motion.div>
      </div>

      {/* Sélecteur semaine */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white border border-line rounded-xl p-4 shadow-card flex items-center gap-3">
        <Calendar size={15} className="text-primary-700 shrink-0" />
        {loadingSem ? <div className="skeleton h-5 rounded w-64" /> : (
          <select className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
            value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Sélectionner une semaine —</option>
            {semaines.map(s => (
              <option key={s.id} value={s.id}>
                {fmtDate(s.date_debut)} → {fmtDate(s.date_fin)}
                {s.annee_academique?.libelle ? ` · ${s.annee_academique.libelle}` : ''}
                {s.statut === 'IMPORTS_OUVERTS' ? ' (ouverte)' : ''}
              </option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Compteur + badge semaine */}
      {selected && !loadingImp && total > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between flex-wrap gap-3 px-1">
          <p className="text-sm text-ink-muted">
            <span className="font-bold text-ink">{recu.length}</span> / {total} département{total > 1 ? 's' : ''} ont déposé leur fichier
          </p>
          {semaine && <Badge status={semaine.statut} />}
        </motion.div>
      )}

      {/* Grille cards */}
      {!selected ? (
        <div className="bg-white border border-line rounded-2xl shadow-card py-16 text-center text-ink-muted text-sm">
          Sélectionnez une semaine pour voir les imports.
        </div>
      ) : loadingImp ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} height="h-28" />)}
        </div>
      ) : imports.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white border border-line rounded-2xl shadow-card py-16 text-center text-ink-muted text-sm">
          Aucun import pour cette semaine.
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {imports.map((imp, i) => {
            const cfg = STATUS_CONFIG[imp.statut_parsing] ?? STATUS_CONFIG.EN_ATTENTE;
            const Icon = cfg.icon;
            const nbUes    = imp.nb_demandes ?? imp.rapport_parsing?.lignes_ok;
            const nbErr    = imp.rapport_parsing?.lignes_erreur ?? 0;
            const recuOk   = imp.statut_parsing === 'OK' || imp.statut_parsing === 'AVEC_ERREURS';
            return (
              <motion.div key={imp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white border rounded-2xl p-4 shadow-card ${cfg.bg}`}
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200">
                      {imp.departement_code ?? '—'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-semibold ${cfg.color}`}>
                    <Icon size={12} />
                    {cfg.label}
                  </div>
                </div>

                {/* Nom */}
                <p className="text-sm font-semibold text-ink leading-tight truncate mb-1">
                  {imp.departement_nom ?? 'Département'}
                </p>

                {/* Infos */}
                {fmtDt(imp.uploaded_at) && (
                  <p className="text-xs text-ink-muted">
                    Déposé le {fmtDt(imp.uploaded_at)}
                  </p>
                )}
                {nbUes != null && (
                  <p className="text-xs text-ink-muted">
                    {nbUes} UE{nbUes > 1 ? 's' : ''}
                    {nbErr > 0 ? ` · ${nbErr} erreur${nbErr > 1 ? 's' : ''}` : ''}
                  </p>
                )}

                {/* Download */}
                {recuOk && (
                  <button onClick={() => handleDownload(imp)} disabled={busy === imp.id}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors disabled:opacity-50">
                    <Download size={11} /> {busy === imp.id ? '…' : 'Télécharger'}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
