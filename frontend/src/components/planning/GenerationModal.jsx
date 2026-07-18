import { useState, useEffect } from 'react';
import { Lock, Cpu, ChevronDown, Sliders } from 'lucide-react';
import Modal from '../ui/Modal';
import api from '../../services/api';

/**
 * Modale de sélection des règles avant génération (DAR).
 *
 * - Les règles STATIQUES/verrouillées sont cochées et désactivées (toujours
 *   appliquées, ré-imposées par le backend).
 * - Les règles DYNAMIQUES sont cochables : pré-cochées selon `active_par_defaut`.
 * - Les objectifs non verrouillés sont togglables (section repliable).
 *
 * `onGenerate(config)` reçoit `{ regles_desactivees, regles_activees,
 * objectifs_desactives, objectifs_activees }`.
 */
export default function GenerationModal({ open, onClose, onGenerate, loading }) {
  const [regles, setRegles]         = useState([]);
  const [objectifs, setObjectifs]   = useState([]);
  const [checked, setChecked]       = useState({});      // code -> bool (règles)
  const [checkedObj, setCheckedObj] = useState({});      // code -> bool (objectifs)
  const [showObj, setShowObj]       = useState(false);
  const [fetching, setFetching]     = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    Promise.all([
      api.get('/regles-solver/', { params: { page_size: 200 } }),
      api.get('/fonctions-objectif/', { params: { page_size: 200 } }),
    ]).then(([rR, rO]) => {
      const rows = (d) => Array.isArray(d) ? d : (d.results ?? []);
      const rg = rows(rR.data), ob = rows(rO.data);
      setRegles(rg);
      setObjectifs(ob);
      setChecked(Object.fromEntries(rg.map(r => [r.code, r.verrouillee || r.active_par_defaut])));
      setCheckedObj(Object.fromEntries(ob.map(o => [o.code, o.verrouillee || o.active_par_defaut])));
    }).catch(() => {}).finally(() => setFetching(false));
  }, [open]);

  const statiques = regles.filter(r => r.verrouillee || r.categorie === 'STATIQUE');
  const dynamiques = regles.filter(r => !(r.verrouillee || r.categorie === 'STATIQUE'));
  const objTogglables = objectifs.filter(o => !o.verrouillee);

  const submit = () => {
    const regles_desactivees = dynamiques.filter(r => r.active_par_defaut && !checked[r.code]).map(r => r.code);
    const regles_activees    = dynamiques.filter(r => !r.active_par_defaut && checked[r.code]).map(r => r.code);
    const objectifs_desactives = objTogglables.filter(o => o.active_par_defaut && !checkedObj[o.code]).map(o => o.code);
    const objectifs_activees   = objTogglables.filter(o => !o.active_par_defaut && checkedObj[o.code]).map(o => o.code);
    onGenerate({ regles_desactivees, regles_activees, objectifs_desactives, objectifs_activees });
  };

  const Row = ({ item, locked, value, onToggle }) => (
    <label className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
      locked
        ? 'bg-surface-alt/60 dark:bg-surface-dark-alt/60 border-line dark:border-line-dark cursor-default'
        : 'border-line dark:border-line-dark hover:bg-surface-alt dark:hover:bg-surface-dark-alt cursor-pointer'
    }`}>
      <input type="checkbox" checked={!!value} disabled={locked} onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded accent-primary-900 dark:accent-gold-500 disabled:opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-ink-strong dark:text-ink-dark-strong">{item.nom}</span>
          {locked && <Lock size={10} className="text-gold-600 dark:text-gold-400 shrink-0" />}
        </div>
        {item.description && <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-snug mt-0.5">{item.description}</p>}
      </div>
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} title="Générer le planning"
      onConfirm={submit} loading={loading} confirmLabel={loading ? 'Génération…' : 'Générer'}>
      {fetching ? (
        <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-50/60 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/40">
            <Cpu size={15} className="text-primary-700 dark:text-primary-300 shrink-0 mt-0.5" />
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
              Sélectionnez les règles à appliquer pour cette génération. Les règles fondatrices sont toujours actives.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-2">
              Règles fondatrices ({statiques.length}) · toujours appliquées
            </p>
            <div className="space-y-1.5">
              {statiques.map(r => <Row key={r.code} item={r} locked value onToggle={() => {}} />)}
            </div>
          </div>

          {dynamiques.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-2">
                Règles dynamiques ({dynamiques.length})
              </p>
              <div className="space-y-1.5">
                {dynamiques.map(r => (
                  <Row key={r.code} item={r} locked={false} value={checked[r.code]}
                    onToggle={() => setChecked(c => ({ ...c, [r.code]: !c[r.code] }))} />
                ))}
              </div>
            </div>
          )}

          {objTogglables.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowObj(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-2">
                <Sliders size={11} /> Objectifs optionnels ({objTogglables.length})
                <ChevronDown size={12} className={`transition-transform ${showObj ? 'rotate-180' : ''}`} />
              </button>
              {showObj && (
                <div className="space-y-1.5">
                  {objTogglables.map(o => (
                    <Row key={o.code} item={o} locked={false} value={checkedObj[o.code]}
                      onToggle={() => setCheckedObj(c => ({ ...c, [o.code]: !c[o.code] }))} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
