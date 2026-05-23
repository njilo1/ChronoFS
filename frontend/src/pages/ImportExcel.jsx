import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const ETAPES = ['Département', 'Fichier', 'Aperçu', 'Résultats']

export default function ImportExcel() {
  const [etape,        setEtape]        = useState(0)
  const [departements, setDepartements] = useState([])
  const [departement,  setDepartement]  = useState('')
  const [fichier,      setFichier]      = useState(null)
  const [dragging,     setDragging]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [apercu,       setApercu]       = useState(null)
  const [resultat,     setResultat]     = useState(null)
  const [error,        setError]        = useState('')
  const inputRef = useRef()

  useEffect(() => {
    api.get('/departements/?page_size=200').then(r => setDepartements(r.data.results ?? r.data))
  }, [])

  /* ── Télécharger le modèle Excel ──────────────────────── */
  async function telechargerModele() {
    try {
      const res = await api.get('/matieres/import/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = 'template_planning_chronofs.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Impossible de télécharger le modèle.')
    }
  }

  /* ── Gestion du fichier ────────────────────────────────── */
  function onFichier(file) {
    if (!file) return
    if (!file.name.endsWith('.xlsx')) { setError('Seuls les fichiers .xlsx sont acceptés.'); return }
    setError('')
    setFichier(file)
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    onFichier(e.dataTransfer.files[0])
  }

  /* ── Lancer l'aperçu (dry_run) ────────────────────────── */
  async function lancerApercu() {
    if (!fichier) { setError('Veuillez sélectionner un fichier.'); return }
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('fichier', fichier)
      form.append('departement', departement)
      form.append('dry_run', 'true')
      const { data } = await api.post('/matieres/import/', form)
      setApercu(data)
      setEtape(2)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de l\'analyse du fichier.')
    } finally { setLoading(false) }
  }

  /* ── Lancer l'import réel ─────────────────────────────── */
  async function lancerImport() {
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('fichier', fichier)
      form.append('departement', departement)
      form.append('dry_run', 'false')
      const { data } = await api.post('/matieres/import/', form)
      setResultat(data)
      setEtape(3)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de l\'import.')
    } finally { setLoading(false) }
  }

  function recommencer() {
    setEtape(0); setDepartement(''); setFichier(null)
    setApercu(null); setResultat(null); setError('')
  }

  const deptCode = departements.find(d => d.id === parseInt(departement))?.code ?? ''

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC', maxWidth: '860px' }}>

      {/* En-tête */}
      <div className="page-header" style={{ marginBottom: '36px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
          Import Excel
        </h1>
        <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
          Importer les plannings transmis par les Chefs de Département (un fichier par département)
        </p>
      </div>

      {/* Steppeur */}
      <Steppeur etape={etape} />

      {/* ── Étape 0 : Choisir le département ──────────────── */}
      {etape === 0 && (
        <Card titre="Choisir le département concerné">
          <p style={{ color: '#4D6A7A', fontSize: '13px', margin: '0 0 20px' }}>
            Sélectionnez le département dont vous importez le planning. Le fichier Excel peut contenir plusieurs filières du même département (ex: TIC pour les filières TIC et TIC-MON).
          </p>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Département</label>
            <select className="admin-select" value={departement} onChange={e => setDepartement(e.target.value)} style={{ maxWidth: '400px' }}>
              <option value="">— Choisir un département —</option>
              {departements.map(d => (
                <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
              ))}
            </select>
          </div>
          {error && <ErreurBarre>{error}</ErreurBarre>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={() => { if (!departement) { setError('Choisissez un département.'); return } setError(''); setEtape(1) }}>
              Continuer <IcoArrow />
            </button>
          </div>
        </Card>
      )}

      {/* ── Étape 1 : Fichier ────────────────────────────── */}
      {etape === 1 && (
        <Card titre={`Fichier Excel — Département ${deptCode}`}>
          {/* Télécharger le modèle */}
          <div style={{
            background: 'rgba(201,164,80,0.05)', border: '1px solid rgba(201,164,80,0.14)',
            borderRadius: '3px', padding: '16px 20px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <IcoExcel />
              <div>
                <p style={{ margin: '0 0 3px', color: '#C9A450', fontWeight: 500, fontSize: '13.5px' }}>Modèle Excel ChronoFS</p>
                <p style={{ margin: 0, color: '#4D6A7A', fontSize: '12px' }}>
                  Colonnes : filière · niveau (L1–M2) · code UE · intitulé · enseignant · type (CM/TD/TP) · volume horaire
                </p>
              </div>
            </div>
            <button className="btn-ghost" onClick={telechargerModele} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <IcoDownload /> Télécharger
            </button>
          </div>

          {/* Zone de dépôt */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? '#C9A450' : fichier ? 'rgba(26,107,62,0.6)' : 'rgba(201,164,80,0.2)'}`,
              borderRadius: '3px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(201,164,80,0.04)' : fichier ? 'rgba(26,107,62,0.04)' : 'transparent',
              transition: 'all 0.2s',
              marginBottom: '20px',
            }}
          >
            <input
              type="file" accept=".xlsx" ref={inputRef}
              style={{ display: 'none' }}
              onChange={e => onFichier(e.target.files[0])}
            />
            {fichier ? (
              <>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>✅</div>
                <p style={{ color: '#4CAF78', margin: '0 0 4px', fontWeight: 500 }}>{fichier.name}</p>
                <p style={{ color: '#3D5766', fontSize: '12px', margin: 0 }}>
                  {(fichier.size / 1024).toFixed(1)} Ko · Cliquer pour changer
                </p>
              </>
            ) : (
              <>
                <div style={{ color: 'rgba(201,164,80,0.35)', marginBottom: '12px' }}><IcoUpload /></div>
                <p style={{ color: '#4D6A7A', margin: '0 0 4px' }}>Glisser-déposer votre fichier .xlsx ici</p>
                <p style={{ color: '#2A3E4E', fontSize: '12px', margin: 0 }}>ou cliquer pour parcourir</p>
              </>
            )}
          </div>

          {error && <ErreurBarre>{error}</ErreurBarre>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-ghost" onClick={() => { setEtape(0); setFichier(null); setError('') }}>
              <IcoBack /> Retour
            </button>
            <button className="btn-primary" onClick={lancerApercu} disabled={loading || !fichier}>
              {loading ? 'Analyse…' : <>Analyser le fichier <IcoArrow /></>}
            </button>
          </div>
        </Card>
      )}

      {/* ── Étape 2 : Aperçu ─────────────────────────────── */}
      {etape === 2 && apercu && (
        <Card titre={`Aperçu de l'import — Dépt. ${apercu.departement} · ${apercu.total_lignes} ligne${apercu.total_lignes !== 1 ? 's' : ''}`}>

          {/* Résumé */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <StatMini valeur={apercu.preview.filter(r=>r.action==='create').length} label="À créer"  couleur="#4CAF78" />
            <StatMini valeur={apercu.preview.filter(r=>r.action==='update').length} label="À mettre à jour" couleur="#C9A450" />
            <StatMini valeur={apercu.blocking_count} label="Erreurs bloquantes" couleur="#DC3545" />
          </div>

          {/* Filières détectées */}
          {apercu.filieres_touchees && apercu.filieres_touchees.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3D5766' }}>
                Filières détectées
              </span>
              {apercu.filieres_touchees.map(fc => (
                <span key={fc} className="badge badge-gold" style={{ fontFamily: 'monospace' }}>{fc}</span>
              ))}
            </div>
          )}

          {/* Table aperçu */}
          {apercu.preview.length > 0 && (
            <div style={{ background: 'rgba(7,9,14,0.6)', border: '1px solid rgba(201,164,80,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="admin-table page-table">
                  <thead>
                    <tr><th>Ligne</th><th>Filière</th><th>Niveau</th><th>Code UE</th><th>Intitulé</th><th>Type</th><th>Enseignant</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {apercu.preview.map(r => (
                      <tr key={r.row}>
                        <td style={{ color: '#3D5766', fontSize: '12px' }}>{r.row}</td>
                        <td><span className="badge badge-gold" style={{ fontFamily: 'monospace' }}>{r.filiere}</span></td>
                        <td>{r.niveau}</td>
                        <td><span className="badge badge-gold" style={{ fontFamily: 'monospace' }}>{r.code}</span></td>
                        <td style={{ maxWidth: '200px', color: '#A0C0D0', fontSize: '12.5px' }}>{r.intitule}</td>
                        <td><span className={`badge ${r.type_seance==='CM'?'badge-gold':r.type_seance==='TD'?'badge-blue':'badge-green'}`}>{r.type_seance}</span></td>
                        <td style={{ color: '#4D6A7A', fontSize: '12px' }}>{r.enseignant}</td>
                        <td>
                          <span className={r.action==='create' ? 'badge badge-green' : 'badge badge-gold'}>
                            {r.action==='create' ? '+ Créer' : '↻ Mettre à jour'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Erreurs et avertissements */}
          {apercu.errors.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(220,53,69,0.6)', marginBottom: '10px' }}>
                Erreurs & avertissements ({apercu.errors.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {apercu.errors.map((e, i) => (
                  <div key={i} style={{
                    background: e.blocking ? 'rgba(220,53,69,0.07)' : 'rgba(201,164,80,0.05)',
                    borderLeft: `2px solid ${e.blocking ? 'rgba(220,53,69,0.5)' : 'rgba(201,164,80,0.3)'}`,
                    padding: '8px 12px', borderRadius: '2px', fontSize: '12.5px',
                    color: e.blocking ? '#D97070' : '#8A9BA8',
                  }}>
                    <strong>Ligne {e.row} · {e.code}</strong> — {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {apercu.preview.length === 0 && apercu.blocking_count > 0 && (
            <div style={{ background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '3px', padding: '16px 20px', marginBottom: '20px', color: '#D97070', fontSize: '13.5px' }}>
              Toutes les lignes contiennent des erreurs bloquantes. Corrigez le fichier et recommencez.
            </div>
          )}

          {error && <ErreurBarre>{error}</ErreurBarre>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-ghost" onClick={() => { setEtape(1); setApercu(null) }}><IcoBack /> Retour</button>
            {apercu.preview.length > 0 && (
              <button className="btn-primary" onClick={lancerImport} disabled={loading}>
                {loading ? 'Import en cours…' : <>Importer {apercu.preview.length} matière{apercu.preview.length!==1?'s':''} <IcoArrow /></>}
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ── Étape 3 : Résultats ───────────────────────────── */}
      {etape === 3 && resultat && (
        <Card titre="Import terminé">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            <StatMini valeur={resultat.created} label="Matières créées"      couleur="#4CAF78" />
            <StatMini valeur={resultat.updated} label="Mises à jour"         couleur="#C9A450" />
            <StatMini valeur={resultat.errors.filter(e=>e.blocking).length}  label="Lignes ignorées" couleur="#DC3545" />
          </div>

          <div style={{
            background: 'rgba(26,107,62,0.08)', border: '1px solid rgba(26,107,62,0.2)',
            borderRadius: '3px', padding: '16px 20px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '22px' }}>✅</span>
            <div>
              <p style={{ margin: '0 0 3px', color: '#4CAF78', fontWeight: 500 }}>
                {resultat.created + resultat.updated} matière{(resultat.created+resultat.updated)!==1?'s':''} importée{(resultat.created+resultat.updated)!==1?'s':''} avec succès
                {resultat.enseignants_crees > 0 && ` · ${resultat.enseignants_crees} enseignant${resultat.enseignants_crees!==1?'s':''} créé${resultat.enseignants_crees!==1?'s':''}`}
              </p>
              <p style={{ margin: 0, color: '#3D5766', fontSize: '12.5px' }}>
                Département {resultat.departement} — {resultat.departement_nom}
                {resultat.filieres_touchees?.length > 0 && ` · Filières : ${resultat.filieres_touchees.join(', ')}`}
              </p>
            </div>
          </div>

          {resultat.errors.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4D6A7A', marginBottom: '10px' }}>
                Avertissements ({resultat.errors.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {resultat.errors.map((e, i) => (
                  <div key={i} style={{
                    borderLeft: `2px solid ${e.blocking ? 'rgba(220,53,69,0.4)' : 'rgba(201,164,80,0.3)'}`,
                    padding: '7px 12px', fontSize: '12.5px',
                    color: e.blocking ? '#D97070' : '#8A9BA8',
                  }}>
                    Ligne {e.row} · <strong>{e.code}</strong> — {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={recommencer}>Nouvel import</button>
            <a href="/matieres" style={{ display: 'inline-flex' }}>
              <button className="btn-primary">Voir les matières <IcoArrow /></button>
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Composants utilitaires ──────────────────────────────── */

function Steppeur({ etape }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
      {ETAPES.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 500,
              background: i < etape ? 'rgba(26,107,62,0.25)' : i === etape ? '#C9A450' : 'rgba(201,164,80,0.08)',
              color: i < etape ? '#4CAF78' : i === etape ? '#07090E' : '#2A4050',
              border: `1px solid ${i < etape ? 'rgba(26,107,62,0.4)' : i === etape ? '#C9A450' : 'rgba(201,164,80,0.12)'}`,
              transition: 'all 0.3s',
            }}>
              {i < etape ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '12.5px', color: i === etape ? '#C9A450' : i < etape ? '#4CAF78' : '#2A4050', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < ETAPES.length - 1 && (
            <div style={{ width: '40px', height: '1px', background: i < etape ? 'rgba(26,107,62,0.4)' : 'rgba(201,164,80,0.1)', margin: '0 12px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ titre, children }) {
  return (
    <div style={{
      background: 'rgba(10,15,22,0.9)', border: '1px solid rgba(201,164,80,0.12)',
      borderRadius: '3px', overflow: 'hidden', animation: 'fadeSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(201,164,80,0.08)' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: '#C9A450', margin: 0, fontWeight: 600 }}>
          {titre}
        </p>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  )
}

function StatMini({ valeur, label, couleur }) {
  return (
    <div style={{
      background: 'rgba(7,9,14,0.6)', border: `1px solid ${couleur}22`,
      borderTop: `2px solid ${couleur}40`, borderRadius: '3px', padding: '16px',
      textAlign: 'center',
    }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: couleur, margin: '0 0 4px', lineHeight: 1 }}>
        {valeur}
      </p>
      <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3D5766', margin: 0 }}>{label}</p>
    </div>
  )
}

function ErreurBarre({ children }) {
  return (
    <div style={{ background: 'rgba(220,53,69,0.07)', borderLeft: '2px solid rgba(220,53,69,0.5)', padding: '10px 14px', borderRadius: '2px', marginBottom: '16px', fontSize: '13px', color: '#D97070' }}>
      {children}
    </div>
  )
}

/* Icônes */
const IcoArrow    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
const IcoBack     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
const IcoDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IcoUpload   = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const IcoExcel    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4CAF78" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
