import { useState, useRef } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import api from '../../../services/api';
import Button from '../../../components/ui/Button';

export default function ChefImport() {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef();

  const handleDownloadTemplate = async () => {
    const res = await api.get('/template-excel/', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = Object.assign(document.createElement('a'), {
      href: url, download: 'template_planning.xlsx',
    });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setPreview(null); setError(''); setSubmitted(false);

    const fd = new FormData();
    fd.append('file', f);
    setLoading(true);
    try {
      const { data } = await api.post('/imports/preview/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Erreur lors de l\'analyse du fichier.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/imports/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-etext font-display text-2xl font-semibold">Importer mon fichier</h1>
        <p className="text-emuted text-sm mt-0.5">Déposez le planning de votre département pour la semaine active</p>
      </div>

      {/* Étape 1 : Télécharger le template */}
      <div className="bg-ecard border border-eborder rounded-xl p-5">
        <h2 className="text-etext font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gold text-ebg text-[10px] flex items-center justify-center font-bold">1</span>
          Télécharger le modèle Excel
        </h2>
        <p className="text-emuted text-sm mb-3">
          Remplissez le modèle officiel avec les UEs et enseignants de votre département.
        </p>
        <Button variant="secondary" onClick={handleDownloadTemplate}>
          <Download size={14} /> Télécharger le template .xlsx
        </Button>
      </div>

      {/* Étape 2 : Déposer le fichier */}
      <div className="bg-ecard border border-eborder rounded-xl p-5">
        <h2 className="text-etext font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gold text-ebg text-[10px] flex items-center justify-center font-bold">2</span>
          Déposer le fichier rempli
        </h2>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-eborder hover:border-gold/50 rounded-lg p-8 text-center cursor-pointer transition-all group"
        >
          <FileSpreadsheet size={28} className="mx-auto mb-2 text-emuted group-hover:text-gold transition-colors" />
          <p className="text-etext text-sm font-medium">
            {file ? file.name : 'Cliquez pour sélectionner votre fichier'}
          </p>
          <p className="text-emuted text-xs mt-1">Format .xlsx uniquement</p>
        </div>
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
          onChange={handleFileChange} />
      </div>

      {/* Chargement */}
      {loading && (
        <div className="flex items-center gap-3 text-emuted text-sm">
          <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          Analyse du fichier…
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && !submitted && (
        <div className="bg-ecard border border-eborder rounded-xl p-5 space-y-4">
          <h2 className="text-etext font-semibold text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gold text-ebg text-[10px] flex items-center justify-center font-bold">3</span>
            Aperçu — {preview.nb_ues ?? 0} UEs détectées
          </h2>

          {preview.ues?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-eborder">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-esb/60 border-b border-eborder">
                    {['Code', 'Intitulé', 'Enseignant', 'Statut'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-emuted font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.ues.slice(0, 10).map((u, i) => (
                    <tr key={i} className="border-b border-eborder/40 last:border-0">
                      <td className="px-3 py-2 text-gold font-medium">{u.code}</td>
                      <td className="px-3 py-2 text-etext">{u.intitule}</td>
                      <td className="px-3 py-2 text-emuted">{u.enseignant ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.erreur ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
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
            <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/25 rounded text-yellow-400 text-xs space-y-0.5">
              {preview.erreurs.map((e, i) => <p key={i}>⚠ {e}</p>)}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading}>
            <Upload size={14} /> Confirmer l'import
          </Button>
        </div>
      )}

      {/* Succès */}
      {submitted && (
        <div className="flex items-center gap-3 px-4 py-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-sm">
          <CheckCircle size={18} />
          <div>
            <p className="font-semibold">Import envoyé avec succès !</p>
            <p className="text-emerald-400/70 text-xs mt-0.5">Le DAR a été notifié. Vous pouvez déposer un nouveau fichier si nécessaire.</p>
          </div>
        </div>
      )}
    </div>
  );
}
