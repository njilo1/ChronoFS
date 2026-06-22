import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet, FileUp } from 'lucide-react';
import api from '../../../services/api';
import { fetchAll } from '../../../services/fetchAll';
import { toast } from '../../../store/toastStore';
import PageShell from '../../../components/ui/PageShell';
import Button from '../../../components/ui/Button';

function StepDot({ n, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${done ? 'bg-success text-white' : active ? 'bg-primary-900 text-white' : 'bg-surface-alt text-ink-muted border border-line'}`}>
        {done ? <CheckCircle size={13} /> : n}
      </div>
    </div>
  );
}

function StepCard({ n, title, active, done, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (n - 1) * 0.06 }}
      className={`bg-white border rounded-2xl p-5 shadow-card transition-colors ${active ? 'border-primary-300 ring-2 ring-primary-500/10' : done ? 'border-success/30' : 'border-line'}`}
    >
      <h2 className="text-ink font-semibold text-sm mb-4 flex items-center gap-2.5">
        <StepDot n={n} active={active} done={done} />
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

export default function ChefImport() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [semaine, setSemaine]     = useState(null);
  const [loadingSem, setLoadingSem] = useState(true);
  const inputRef = useRef();

  // Récupère la semaine active (statut IMPORTS_OUVERTS) au montage. C'est
  // elle qui sera transmise à tous les endpoints backend qui exigent
  // `?semaine=<id>` (template, preview, dépôt).
  useEffect(() => {
    fetchAll('/semaines/')
      .then(list => {
        const active = list.find(s => s.statut === 'IMPORTS_OUVERTS')
                     ?? list.find(s => s.statut === 'DRAFT')
                     ?? list[0];
        setSemaine(active ?? null);
      })
      .catch(() => setSemaine(null))
      .finally(() => setLoadingSem(false));
  }, []);

  const handleDownloadTemplate = async () => {
    if (!semaine) {
      setError("Aucune semaine ouverte n'a été trouvée. Contactez la DAR.");
      return;
    }
    setError('');
    try {
      const res = await api.get('/template-excel/', {
        params: { semaine: semaine.id },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `Modele_planning_S${semaine.id}.xlsx`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Pour les responseType:'blob', le message d'erreur est dans le blob → on le lit
      let msg = 'Erreur lors du téléchargement du modèle.';
      if (err.response?.data instanceof Blob) {
        try {
          const txt = await err.response.data.text();
          const parsed = JSON.parse(txt);
          msg = parsed.detail || parsed.semaine || parsed.departement || msg;
        } catch { /* ignore */ }
      } else {
        msg = err.response?.data?.detail ?? msg;
      }
      setError(msg);
    }
  };

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.xlsx')) return;
    if (!semaine) {
      setError("Aucune semaine ouverte n'a été trouvée. Contactez la DAR.");
      return;
    }
    setFile(f); setPreview(null); setError(''); setSubmitted(false);
    const fd = new FormData();
    fd.append('fichier', f);
    fd.append('semaine', semaine.id);
    setLoading(true);
    try {
      const { data } = await api.post('/imports/preview/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.detail ?? err.response?.data?.fichier ?? "Erreur lors de l'analyse du fichier.");
    } finally { setLoading(false); }
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleSubmit = async () => {
    if (!file || !semaine) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('fichier', file);
    fd.append('semaine', semaine.id);
    try {
      await api.post('/imports/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      toast.success('Votre planning a été envoyé avec succès.');
    } catch (err) {
      const d = err.response?.data;
      setError(d?.message ?? d?.detail ?? d?.fichier ?? "Erreur lors de l'import.");
    } finally { setLoading(false); }
  };

  const step1Done = true;
  const step2Done = !!file && !error;

  return (
    <PageShell
      icon={FileUp}
      title="Importer mes cours"
      subtitle="Déposez le planning de votre département pour la semaine active"
    >
      <div className="space-y-4 max-w-2xl">
        {/* Étape 1 — Modèle */}
        <StepCard n={1} title="Télécharger le modèle Excel" active={!file} done={step1Done}>
          <p className="text-ink-muted text-sm mb-3">
            Remplissez le modèle officiel avec les UEs et enseignants de votre département.
          </p>
          {loadingSem ? (
            <p className="text-xs text-ink-subtle italic">Chargement de la semaine active…</p>
          ) : semaine ? (
            <>
              <div className="mb-3 text-xs text-ink-muted">
                Semaine ciblée : <strong className="text-ink-strong">
                  {new Date(semaine.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  {' → '}
                  {new Date(semaine.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </strong>
              </div>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                <Download size={14} /> Télécharger le modèle .xlsx
              </Button>
            </>
          ) : (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-warning/8 border border-warning/25 rounded-xl text-warning text-sm">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              Aucune semaine n'est ouverte pour les imports. Contactez la DAR.
            </div>
          )}
        </StepCard>

        {/* Étape 2 — Upload */}
        <StepCard n={2} title="Sélectionner le fichier rempli" active={!file || !!error} done={step2Done}>
          <motion.div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            animate={{ backgroundColor: isDragging ? 'rgba(30,58,138,0.04)' : 'rgba(0,0,0,0)', scale: isDragging ? 1.005 : 1 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-line p-4"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <motion.button
                whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors shadow-sm"
              >
                <Upload size={14} />
                {file ? 'Changer de fichier' : 'Sélectionner mon fichier'}
              </motion.button>

              <AnimatePresence>
                {file && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <FileSpreadsheet size={14} className="text-success shrink-0" />
                    <span className="font-medium truncate max-w-[200px]" title={file.name}>{file.name}</span>
                    <span className="text-ink-muted text-xs">({(file.size / 1024).toFixed(0)} Ko)</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-ink-subtle mt-2.5">
              Format accepté : .xlsx &middot; Taille max 5 Mo &middot; Glisser-déposer accepté
            </p>
            <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
          </motion.div>
        </StepCard>

        {/* Loader */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-ink-muted text-sm px-1">
              <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-700 rounded-full animate-spin shrink-0" />
              Analyse du fichier…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erreur */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 px-4 py-3 bg-danger/8 border border-danger/20 rounded-xl text-danger text-sm">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Étape 3 — Aperçu & envoi */}
        <AnimatePresence>
          {preview && !submitted && (
            <StepCard n={3} title={`Aperçu — ${preview.nb_ues ?? 0} UE${(preview.nb_ues ?? 0) > 1 ? 's' : ''} détectée${(preview.nb_ues ?? 0) > 1 ? 's' : ''}`} active done={false}>
              {preview.ues?.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-line mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-line">
                        {['Code', 'Intitulé', 'Enseignant', 'Statut'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] font-bold text-ink-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.ues.slice(0, 10).map((u, i) => (
                        <tr key={i} className="border-b border-line/40 last:border-0 hover:bg-surface-alt transition-colors">
                          <td className="px-3 py-2 font-bold text-primary-700">{u.code}</td>
                          <td className="px-3 py-2 text-ink">{u.intitule}</td>
                          <td className="px-3 py-2 text-ink-muted">{u.enseignant ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${u.erreur ? 'bg-danger/10 text-danger border-danger/25' : 'bg-success/10 text-success border-success/25'}`}>
                              {u.erreur ?? 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.erreurs?.length > 0 && (
                <div className="px-3.5 py-2.5 bg-warning/8 border border-warning/25 rounded-xl text-warning text-xs space-y-1 mb-4">
                  {preview.erreurs.map((e, i) => <p key={i}>&#9888; {e}</p>)}
                </div>
              )}

              {/* Avertissements non bloquants (vérification intelligente) :
                  conflits inter-départements. Le chef peut envoyer quand même. */}
              {preview.avertissements?.length > 0 && (
                <div className="px-3.5 py-2.5 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800/50 rounded-xl text-primary-800 dark:text-primary-200 text-xs space-y-1 mb-4">
                  <p className="font-bold mb-0.5">À vérifier (non bloquant) :</p>
                  {preview.avertissements.map((a, i) => <p key={i}>&#128161; {a}</p>)}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={loading}>
                <Upload size={14} /> Confirmer l'envoi
              </Button>
            </StepCard>
          )}
        </AnimatePresence>

        {/* Succès */}
        <AnimatePresence>
          {submitted && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3.5 px-5 py-4 bg-success/8 border border-success/25 rounded-2xl text-success">
              <CheckCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold text-sm">Fichier envoyé avec succès !</p>
                <p className="text-success/70 text-xs mt-0.5">La DAR a été notifiée. Vous pouvez renvoyer un nouveau fichier si nécessaire.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
