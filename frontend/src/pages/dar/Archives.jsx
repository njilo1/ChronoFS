import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Download, Archive, Calendar, Trash2, FileText } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import PageShell from '../../components/ui/PageShell';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../components/ui/Skeleton';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDt   = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Archives() {
  const [semaines, setSemaines]     = useState([]);
  const [selected, setSelected]    = useState('');
  const [archives, setArchives]    = useState([]);
  const [loadingSem, setLoadingSem] = useState(true);
  const [loadingArc, setLoadingArc] = useState(false);
  const [busy, setBusy]            = useState(null);
  const [confirm, setConfirm]      = useState({ open: false, mode: null, target: null });

  useEffect(() => {
    api.get('/semaines/').then(r => {
      const list = Array.isArray(r.data) ? r.data : (r.data.results ?? []);
      const published = list.filter(s => s.statut === 'PUBLIE' || s.statut === 'GENERE');
      setSemaines(published);
      if (published.length) setSelected(String(published[0].id));
    }).finally(() => setLoadingSem(false));
  }, []);

  const refetchArchives = () => {
    if (!selected) return;
    setLoadingArc(true);
    api.get(`/semaines/${selected}/archives/`)
      .then(r => setArchives(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
      .catch(() => setArchives([]))
      .finally(() => setLoadingArc(false));
  };

  useEffect(refetchArchives, [selected]);

  const handleDownload = async (arc, type) => {
    setBusy(`${arc.id}-${type}`);
    try {
      const res = await api.get(`/semaines/${selected}/archives/${arc.id}/telecharger/`, {
        params: { type }, responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `Planning_v${arc.version ?? 1}.${type}`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} téléchargé.`);
    } catch (err) {
      toast.error(extractApiError(err, 'Échec du téléchargement.'));
    } finally { setBusy(null); }
  };

  // — Suppression d'une seule archive —
  const askDeleteOne = (arc) => setConfirm({ open: true, mode: 'one', target: arc });

  // — Suppression de toutes les archives de la semaine —
  const askDeleteAll = () => setConfirm({ open: true, mode: 'all', target: null });

  const execDelete = async () => {
    if (!selected) return;
    if (confirm.mode === 'one' && confirm.target) {
      try {
        await api.delete(`/semaines/${selected}/archives/${confirm.target.id}/`);
        setArchives((prev) => prev.filter((a) => a.id !== confirm.target.id));
        toast.success('Archive supprimée.');
      } catch (err) {
        toast.error(extractApiError(err));
      }
    } else if (confirm.mode === 'all') {
      try {
        await api.delete(`/semaines/${selected}/archives-tout/`);
        setArchives([]);
        toast.success('Toutes les archives ont été supprimées.');
      } catch (err) {
        toast.error(extractApiError(err));
      }
    }
    setConfirm({ open: false, mode: null, target: null });
  };

  const COLS = [
    { key: 'version', label: 'Version', render: r => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-surface-alt text-ink-strong border border-line dark:bg-surface-dark-alt dark:text-ink-dark-strong dark:border-line-dark">
        v{r.version ?? 1}
      </span>
    )},
    { key: 'fichiers', label: 'Fichiers', render: r => (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-danger/10 text-danger border-danger/25 dark:bg-danger/20 dark:text-red-300 dark:border-danger/30">PDF</span>
        {r.docx_url
          ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60">DOCX</span>
          : <span className="text-[11px] text-ink-subtle dark:text-ink-dark-subtle">PDF seul</span>}
      </div>
    )},
    { key: 'exporte_le', label: 'Exporté le', render: r => <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{fmtDt(r.exporte_le)}</span> },
    { key: 'exporte_par_nom', label: 'Exporté par', render: r => <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.exporte_par_nom ?? '—'}</span> },
    { key: '_actions', label: 'Actions', render: r => (
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => handleDownload(r, 'pdf')}
          disabled={busy === `${r.id}-pdf`}
          title="Télécharger le PDF"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-md transition-colors disabled:opacity-50 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60 dark:hover:bg-primary-900/50"
        >
          <Download size={11} /> {busy === `${r.id}-pdf` ? '…' : 'PDF'}
        </button>
        {r.docx_url && (
          <button
            onClick={() => handleDownload(r, 'docx')}
            disabled={busy === `${r.id}-docx`}
            title="Télécharger le DOCX"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-md transition-colors disabled:opacity-50 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800/60 dark:hover:bg-primary-900/50"
          >
            <FileText size={11} /> {busy === `${r.id}-docx` ? '…' : 'DOCX'}
          </button>
        )}
        <button
          onClick={() => askDeleteOne(r)}
          title="Supprimer définitivement"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-danger bg-danger/5 hover:bg-danger/10 border border-danger/25 rounded-md transition-colors dark:bg-danger/15 dark:hover:bg-danger/25 dark:text-red-300 dark:border-danger/30"
        >
          <Trash2 size={11} /> Supprimer
        </button>
      </div>
    )},
  ];

  const sorted = [...archives].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0));

  return (
    <PageShell
      icon={Archive}
      title="Archives"
      subtitle="Historique des plannings exportés par semaine"
      count={loadingArc ? null : archives.length}
      action={
        sorted.length > 0 ? (
          <Button variant="danger" onClick={askDeleteAll}>
            <Trash2 size={14} /> Supprimer tout
          </Button>
        ) : null
      }
    >
      {/* Sélecteur semaine */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-md p-4 shadow-card flex items-center gap-3">
        <Calendar size={15} className="text-primary-700 dark:text-primary-300 shrink-0" />
        {loadingSem ? <div className="skeleton h-5 rounded w-64" /> : (
          <select className="flex-1 bg-transparent text-sm text-ink-strong dark:text-ink-dark-strong focus:outline-none"
            value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Sélectionner une semaine —</option>
            {semaines.map(s => (
              <option key={s.id} value={s.id}>
                {fmtDate(s.date_debut)} → {fmtDate(s.date_fin)}
                {s.annee_academique?.libelle ? ` · ${s.annee_academique.libelle}` : ''}
              </option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Tableau */}
      {loadingArc ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <SkeletonCard key={i} height="h-12" />)}
        </div>
      ) : (
        <Table
          columns={COLS}
          data={sorted}
          loading={false}
          emptyText={selected ? 'Aucune archive pour cette semaine.' : 'Sélectionnez une semaine.'}
        />
      )}

      {/* Dialog de confirmation suppression */}
      <ConfirmDialog
        open={confirm.open}
        title={
          confirm.mode === 'all'
            ? `Supprimer toutes les archives ?`
            : `Supprimer cette archive ?`
        }
        description={
          confirm.mode === 'all'
            ? `Toutes les versions PDF et DOCX archivées pour cette semaine vont être définitivement supprimées (${sorted.length} fichier${sorted.length > 1 ? 's' : ''}). Cette action est irréversible.`
            : `La version v${confirm.target?.version ?? '?'} (${confirm.target?.format ?? 'PDF'}) sera définitivement supprimée du disque et de la base. Cette action est irréversible.`
        }
        confirmLabel={confirm.mode === 'all' ? 'Tout supprimer' : 'Supprimer'}
        onConfirm={execDelete}
        onCancel={() => setConfirm({ open: false, mode: null, target: null })}
      />
    </PageShell>
  );
}
