import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Modal from '../components/Modal'

const DEFAULT = {
  type_planning: 'cours',
  campus: '',
  semaine_debut: '', semaine_fin: '',
  semestre: '1', annee_academique: '2025-2026', est_publie: false,
}

export default function Plannings() {
  const navigate = useNavigate()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [edit,    setEdit]    = useState(null)
  const [form,    setForm]    = useState(DEFAULT)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [villeFilter, setVilleFilter] = useState('')  // '' | 'Ebolowa' | 'Monatélé'

  // ── États pour la génération ──────────────────────────────────────────────
  const [campuses,   setCampuses]   = useState([])       // liste des campus
  const [genTarget,  setGenTarget]  = useState(null)     // EDT sélectionné pour génération
  const [filieres,   setFilieres]   = useState([])       // liste de toutes les filières
  const [genConfig,  setGenConfig]  = useState({         // options du formulaire
    filiere_ids: [], ecraser: false, dry_run: false,
  })
  const [genStep,    setGenStep]    = useState('config') // 'config' | 'running' | 'results'
  const [genResult,  setGenResult]  = useState(null)     // réponse de l'API

  useEffect(() => {
    load()
    api.get('/campus/?page_size=200').then(({ data }) => setCampuses(data.results ?? data)).catch(() => {})
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/emplois-du-temps/?type_planning=cours&page_size=200')
      setItems(data.results)
    } finally { setLoading(false) }
  }

  // Pré-remplit le campus à la création selon le filtre actif (1ᵉʳ campus de la ville)
  function openCreate() {
    let initialCampus = ''
    if (villeFilter) {
      const c = campuses.find(c => c.ville === villeFilter)
      if (c) initialCampus = c.id
    }
    setEdit(null)
    setForm({ ...DEFAULT, campus: initialCampus })
    setError(''); setModal(true)
  }

  // Liste filtrée par ville du campus
  const itemsFiltres = villeFilter
    ? items.filter(p => p.campus_ville === villeFilter)
    : items
  const compteurEbolowa = items.filter(p => p.campus_ville === 'Ebolowa').length
  const compteurMonatele = items.filter(p => p.campus_ville === 'Monatélé').length
  function openEdit(item) {
    setEdit(item)
    setForm({
      type_planning: item.type_planning ?? 'cours',
      campus: item.campus ?? '',
      semaine_debut: item.semaine_debut, semaine_fin: item.semaine_fin,
      semestre: item.semestre, annee_academique: item.annee_academique,
      est_publie: item.est_publie,
    })
    setError(''); setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (edit) await api.put(`/emplois-du-temps/${edit.id}/`, form)
      else      await api.post('/emplois-du-temps/', form)
      await load(); setModal(false)
    } catch (err) {
      setError(err.response?.data?.detail ?? JSON.stringify(err.response?.data) ?? 'Erreur.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet emploi du temps ? Tous ses créneaux seront supprimés.')) return
    try { await api.delete(`/emplois-du-temps/${id}/`); await load() }
    catch { alert('Erreur lors de la suppression.') }
  }

  async function togglePublie(item) {
    try {
      await api.patch(`/emplois-du-temps/${item.id}/`, { est_publie: !item.est_publie })
      await load()
    } catch { alert('Erreur lors de la mise à jour.') }
  }

  // ── Ouvrir la modal de génération ─────────────────────────────────────────
  async function openGen(item) {
    setGenTarget(item)
    setGenConfig({ filiere_ids: [], ecraser: false, dry_run: false })
    setGenStep('config')
    setGenResult(null)

    // Charger les filières filtrées par campus de l'EDT si disponible
    if (filieres.length === 0) {
      try {
        const url = item.campus
          ? `/filieres/?campus=${item.campus}&page_size=200`
          : '/filieres/?page_size=200'
        const { data } = await api.get(url)
        setFilieres(data.results ?? data)
      } catch { setFilieres([]) }
    }
  }

  function closeGen() { setGenTarget(null) }

  // Cocher / décocher une filière dans le formulaire de génération
  function toggleFiliere(id) {
    setGenConfig(prev => ({
      ...prev,
      filiere_ids: prev.filiere_ids.includes(id)
        ? prev.filiere_ids.filter(x => x !== id)
        : [...prev.filiere_ids, id],
    }))
  }

  // ── Lancer la génération ──────────────────────────────────────────────────
  async function handleGenerate() {
    if (genConfig.filiere_ids.length === 0) {
      alert('Sélectionnez au moins une filière.')
      return
    }
    setGenStep('running')
    try {
      const { data } = await api.post('/emplois/generer/', {
        emploi_du_temps_id: genTarget.id,
        filiere_ids:        genConfig.filiere_ids,
        ecraser:            genConfig.ecraser,
        dry_run:            genConfig.dry_run,
      })
      setGenResult(data)
      setGenStep('results')
      if (!genConfig.dry_run) await load()  // rafraîchir le compteur de créneaux
    } catch (err) {
      alert(err.response?.data?.error ?? 'Erreur lors de la génération.')
      setGenStep('config')
    }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: '34px',
            fontWeight: 600, color: '#C9A450', margin: '0 0 4px',
          }}>
            Emplois du temps
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
            Créez une semaine puis lancez la génération automatique par filière
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouvelle semaine</button>
      </div>

      {/* Onglets de campus */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        borderBottom: '1px solid rgba(201,164,80,0.12)',
      }}>
        <CampusTab actif={villeFilter === ''}        label="Tous"     compteur={items.length}      onClick={() => setVilleFilter('')} />
        <CampusTab actif={villeFilter === 'Ebolowa'} label="Ebolowa"  compteur={compteurEbolowa}    onClick={() => setVilleFilter('Ebolowa')} />
        <CampusTab actif={villeFilter === 'Monatélé'} label="Monatélé" compteur={compteurMonatele}  onClick={() => setVilleFilter('Monatélé')} />
      </div>

      {/* Avertissement si vide */}
      {!loading && itemsFiltres.length === 0 && items.length === 0 && (
        <div style={{
          background: 'rgba(201,164,80,0.05)', border: '1px solid rgba(201,164,80,0.14)',
          borderRadius: '3px', padding: '24px 28px', marginBottom: '24px',
          display: 'flex', alignItems: 'flex-start', gap: '14px',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>📅</span>
          <div>
            <p style={{ margin: '0 0 6px', color: '#C9A450', fontWeight: 500 }}>Aucun emploi du temps créé</p>
            <p style={{ margin: 0, color: '#4D6A7A', fontSize: '13px' }}>
              Créez une semaine pour commencer. Assurez-vous d'avoir renseigné les salles,
              filières, matières et enseignants avant de lancer la génération.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)',
        borderRadius: '3px', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
        ) : itemsFiltres.length === 0 && items.length > 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766', fontSize: '13px' }}>
            Aucun emploi du temps pour <strong style={{ color: '#8AACBA' }}>{villeFilter}</strong>.<br/>
            <span style={{ fontSize: '11.5px', color: '#2A4555' }}>
              Créez-en un avec le bouton « Nouvelle semaine ».
            </span>
          </div>
        ) : itemsFiltres.length > 0 ? (
          <table className="admin-table page-table">
            <thead>
              <tr>
                <th>Année</th>
                <th>Semestre</th>
                <th>Semaine</th>
                <th>Créneaux</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {itemsFiltres.map(p => (
                <tr key={p.id}>
                  <td style={{ color: '#EDE8DC', fontWeight: 500 }}>{p.annee_academique}</td>
                  <td><span className="badge badge-gold">S{p.semestre}</span></td>
                  <td style={{ color: '#6A8A9A', fontSize: '12.5px' }}>
                    {p.semaine_debut} → {p.semaine_fin}
                  </td>
                  <td>
                    <span className="badge badge-gray">
                      {p.nb_creneaux} créneau{p.nb_creneaux !== 1 ? 'x' : ''}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => togglePublie(p)}
                      className={p.est_publie ? 'badge badge-green' : 'badge badge-gray'}
                      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      title={p.est_publie ? 'Cliquer pour dépublier' : 'Cliquer pour publier'}
                    >
                      {p.est_publie ? '✓ Publié' : 'Brouillon'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {/* Bouton Voir grille */}
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/grille/${p.id}`)}
                      title="Voir la grille EDT"
                      style={{
                        color: '#50A0DC', border: '1px solid rgba(80,160,220,0.25)',
                        borderRadius: '2px', padding: '5px 7px', marginRight: '4px',
                        background: 'rgba(80,160,220,0.06)',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(80,160,220,0.14)'; e.currentTarget.style.borderColor = 'rgba(80,160,220,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(80,160,220,0.06)'; e.currentTarget.style.borderColor = 'rgba(80,160,220,0.25)' }}
                    >
                      <IcoGrid />
                    </button>
                    {/* Bouton Exporter PDF */}
                    <button
                      className="btn-icon"
                      onClick={() => window.open(`http://localhost:8000/api/emplois-du-temps/${p.id}/export-pdf/`, '_blank')}
                      title="Exporter en PDF"
                      style={{
                        color: '#DC6464', border: '1px solid rgba(220,100,100,0.25)',
                        borderRadius: '2px', padding: '5px 7px', marginRight: '4px',
                        background: 'rgba(220,100,100,0.06)',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,100,100,0.14)'; e.currentTarget.style.borderColor = 'rgba(220,100,100,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,100,100,0.06)'; e.currentTarget.style.borderColor = 'rgba(220,100,100,0.25)' }}
                    >
                      <IcoPDF />
                    </button>
                    {/* Bouton Générer l'EDT */}
                    <button
                      className="btn-icon"
                      onClick={() => openGen(p)}
                      title="Générer l'emploi du temps"
                      style={{
                        color: '#C9A450', border: '1px solid rgba(201,164,80,0.25)',
                        borderRadius: '2px', padding: '5px 7px', marginRight: '4px',
                        background: 'rgba(201,164,80,0.06)',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,164,80,0.14)'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,164,80,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.25)' }}
                    >
                      <IcoGen />
                    </button>
                    <button className="btn-icon btn-icon-edit"   onClick={() => openEdit(p)}      title="Modifier"><IcoEdit /></button>
                    <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(p.id)} title="Supprimer"><IcoTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* ── Modal EDT (créer / modifier) ─────────────────────────────────────── */}
      {modal && (
        <Modal
          title={edit ? "Modifier l'emploi du temps" : 'Nouvel emploi du temps'}
          onClose={() => setModal(false)}
          onSubmit={handleSave}
          saving={saving}
          error={error}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="form-label">Campus</label>
              <select className="admin-select" value={form.campus} onChange={f('campus')}>
                <option value="">— Tous les campus —</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.ville})</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Début de semaine</label>
                <input className="admin-input" type="date" value={form.semaine_debut} onChange={f('semaine_debut')} required />
              </div>
              <div>
                <label className="form-label">Fin de semaine</label>
                <input className="admin-input" type="date" value={form.semaine_fin} onChange={f('semaine_fin')} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Semestre</label>
                <select className="admin-select" value={form.semestre} onChange={f('semestre')}>
                  <option value="1">Semestre 1</option>
                  <option value="2">Semestre 2</option>
                </select>
              </div>
              <div>
                <label className="form-label">Année académique</label>
                <input className="admin-input" value={form.annee_academique} onChange={f('annee_academique')} placeholder="2025-2026" required />
              </div>
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={form.est_publie} onChange={e => setForm(v => ({ ...v, est_publie: e.target.checked }))} />
              Publier cet emploi du temps
            </label>
          </div>
        </Modal>
      )}

      {/* ── Modal de génération automatique ──────────────────────────────────── */}
      {genTarget && (
        <GenModal
          edt={genTarget}
          filieres={filieres}
          config={genConfig}
          step={genStep}
          result={genResult}
          onToggleFiliere={toggleFiliere}
          onConfigChange={(key, val) => setGenConfig(prev => ({ ...prev, [key]: val }))}
          onGenerate={handleGenerate}
          onClose={closeGen}
          onRetry={() => { setGenStep('config'); setGenResult(null) }}
        />
      )}
    </div>
  )
}

// ── Modal de génération ───────────────────────────────────────────────────────

function GenModal({ edt, filieres, config, step, result, onToggleFiliere, onConfigChange, onGenerate, onClose, onRetry }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: '580px', maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* En-tête */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(201,164,80,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {[28, 16, 8].map((w, i) => (
                  <div key={i} style={{ height: '1px', width: `${w}px`, background: `rgba(201,164,80,${0.5 - i * 0.12})` }} />
                ))}
              </div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: '22px',
                fontWeight: 600, color: '#C9A450', margin: '0 0 4px',
              }}>
                {step === 'results' ? 'Résultats de génération' : 'Générer l\'emploi du temps'}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#3D5766' }}>
                {edt.annee_academique} — S{edt.semestre} — {edt.semaine_debut} → {edt.semaine_fin}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#3D5766', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
            >×</button>
          </div>
        </div>

        {/* Corps scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>

          {/* ── Étape 1 : Configuration ───────────────────────────────────── */}
          {step === 'config' && (
            <>
              <p style={{ fontSize: '12px', color: '#4D6A7A', margin: '0 0 16px' }}>
                Sélectionnez les filières à inclure dans la génération.
                L'algorithme respectera toutes les contraintes UEB (horaires, salles, enseignants).
              </p>

              {/* Liste des filières */}
              <label style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2A4555', display: 'block', marginBottom: '8px' }}>
                Filières à inclure
              </label>
              <div style={{
                border: '1px solid rgba(201,164,80,0.12)', borderRadius: '2px',
                overflow: 'hidden', marginBottom: '20px',
              }}>
                {filieres.length === 0 ? (
                  <div style={{ padding: '16px', color: '#3D5766', fontSize: '13px', textAlign: 'center' }}>
                    Aucune filière trouvée. Créez des filières dans la section Gestion.
                  </div>
                ) : (
                  filieres.map((fil, idx) => {
                    const checked = config.filiere_ids.includes(fil.id)
                    return (
                      <div
                        key={fil.id}
                        onClick={() => onToggleFiliere(fil.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px', cursor: 'pointer',
                          background: checked ? 'rgba(201,164,80,0.07)' : 'transparent',
                          borderBottom: idx < filieres.length - 1 ? '1px solid rgba(201,164,80,0.07)' : 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', border: `1px solid ${checked ? '#C9A450' : 'rgba(201,164,80,0.25)'}`,
                          borderRadius: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: checked ? '#C9A450' : 'transparent', transition: 'all 0.15s',
                        }}>
                          {checked && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" stroke="#07090E" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: checked ? '#EDE8DC' : '#8AA0AF', fontSize: '13.5px', fontWeight: checked ? 500 : 400 }}>
                            <span style={{ color: checked ? '#C9A450' : '#4D6A7A', fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', marginRight: '8px' }}>
                              {fil.code}
                            </span>
                            {fil.nom}
                          </span>
                        </div>
                        {fil.effectif > 0 && (
                          <span style={{ fontSize: '11px', color: '#2A4555', flexShrink: 0 }}>
                            {fil.effectif} étu.
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Options */}
              <label style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2A4555', display: 'block', marginBottom: '10px' }}>
                Options
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <OptionToggle
                  checked={config.dry_run}
                  onChange={val => onConfigChange('dry_run', val)}
                  label="Aperçu seulement"
                  desc="Simuler la génération sans rien enregistrer en base de données"
                />
                <OptionToggle
                  checked={config.ecraser}
                  onChange={val => onConfigChange('ecraser', val)}
                  label="Écraser les créneaux auto"
                  desc="Supprimer les créneaux générés précédemment avant de régénérer"
                  warn
                />
              </div>
            </>
          )}

          {/* ── Étape 2 : Génération en cours ────────────────────────────────── */}
          {step === 'running' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '44px', height: '44px', margin: '0 auto 20px',
                border: '2px solid rgba(201,164,80,0.15)',
                borderTopColor: '#C9A450',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }} />
              <p style={{ color: '#C9A450', margin: '0 0 6px', fontFamily: "'Cormorant Garamond', serif", fontSize: '18px' }}>
                Génération en cours…
              </p>
              <p style={{ color: '#3D5766', fontSize: '12px', margin: 0 }}>
                L'algorithme MRV planifie les matières par ordre de contrainte décroissante.
              </p>
            </div>
          )}

          {/* ── Étape 3 : Résultats ───────────────────────────────────────────── */}
          {step === 'results' && result && (
            <>
              {/* Bandeau de stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px', marginBottom: '24px',
              }}>
                <StatCard icon="✓" value={result.nb_places} label="Placés" color="#4CAF50" />
                <StatCard icon="⚠" value={result.nb_non_places} label="Non placés" color={result.nb_non_places > 0 ? '#C9A450' : '#4CAF50'} />
                <StatCard icon="⏱" value={`${result.duree_ms} ms`} label="Durée" color="#4D8A9A" />
              </div>

              {result.dry_run && (
                <div style={{
                  background: 'rgba(201,164,80,0.06)', border: '1px solid rgba(201,164,80,0.2)',
                  borderRadius: '2px', padding: '10px 14px', marginBottom: '16px',
                  fontSize: '12px', color: '#8A9A6A',
                }}>
                  Mode aperçu — aucun créneau n'a été enregistré en base de données.
                </div>
              )}

              {/* Matières non placées */}
              {result.non_places.length > 0 && (
                <>
                  <label style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2A4555', display: 'block', marginBottom: '8px' }}>
                    Matières non planifiées ({result.non_places.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {result.non_places.map((np, i) => (
                      <div key={i} style={{
                        background: 'rgba(220,53,69,0.04)', border: '1px solid rgba(220,53,69,0.15)',
                        borderRadius: '2px', padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <span style={{ color: '#C9A450', fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', marginRight: '8px' }}>
                              {np.matiere}
                            </span>
                            <span style={{ color: '#8AA0AF', fontSize: '13px' }}>{np.intitule}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#DC3545', flexShrink: 0, marginLeft: '12px' }}>
                            {np.seances_manquantes} séance{np.seances_manquantes > 1 ? 's' : ''} manquante{np.seances_manquantes > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#3D5766', marginBottom: '6px' }}>
                          {np.niveau} — {np.enseignant}
                        </div>
                        {np.raisons.map((r, j) => (
                          <div key={j} style={{
                            fontSize: '11.5px', color: '#DC3545', opacity: 0.75,
                            paddingLeft: '10px', borderLeft: '2px solid rgba(220,53,69,0.3)',
                            marginTop: '4px',
                          }}>
                            {r}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Aperçu (dry_run) — 10 premières lignes */}
              {result.dry_run && result.apercu.length > 0 && (
                <>
                  <label style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2A4555', display: 'block', marginBottom: '8px' }}>
                    Aperçu des premiers créneaux ({Math.min(result.apercu.length, 10)} / {result.apercu.length})
                  </label>
                  <div style={{
                    border: '1px solid rgba(201,164,80,0.09)', borderRadius: '2px', overflow: 'hidden',
                  }}>
                    {result.apercu.slice(0, 10).map((c, i) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '90px 1fr 60px 70px',
                        gap: '10px', padding: '8px 12px', alignItems: 'center',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(201,164,80,0.02)',
                        borderBottom: i < 9 ? '1px solid rgba(201,164,80,0.06)' : 'none',
                        fontSize: '12px',
                      }}>
                        <span style={{ color: '#C9A450', fontFamily: "'Cormorant Garamond', serif", fontSize: '13px' }}>{c.matiere}</span>
                        <span style={{ color: '#8AA0AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.intitule}</span>
                        <span style={{ color: '#3D5766' }}>Salle {c.salle}</span>
                        <span style={{ color: '#4D8A9A', textTransform: 'capitalize' }}>{c.jour.slice(0, 3)}. {c.heure.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Message succès si tout placé */}
              {result.nb_non_places === 0 && (
                <div style={{
                  background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.2)',
                  borderRadius: '2px', padding: '12px 16px', marginTop: '16px',
                  fontSize: '13px', color: '#6BBF6E',
                }}>
                  Toutes les matières ont été planifiées avec succès.
                  {!result.dry_run && ' Les créneaux ont été enregistrés dans la base de données.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied de modal */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid rgba(201,164,80,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0,
        }}>
          {step === 'config' && (
            <>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: '1px solid rgba(201,164,80,0.18)',
                  color: '#6A8A9A', padding: '8px 18px', borderRadius: '2px',
                  cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={onGenerate}
                disabled={config.filiere_ids.length === 0}
                style={{
                  background: config.filiere_ids.length === 0 ? 'rgba(201,164,80,0.2)' : '#C9A450',
                  border: 'none', color: '#07090E', padding: '8px 22px', borderRadius: '2px',
                  cursor: config.filiere_ids.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <IcoGen />
                {config.dry_run ? 'Lancer l\'aperçu' : 'Générer l\'EDT'}
              </button>
            </>
          )}

          {step === 'results' && (
            <>
              {result?.dry_run && (
                <button
                  onClick={onRetry}
                  style={{
                    background: 'none', border: '1px solid rgba(201,164,80,0.18)',
                    color: '#6A8A9A', padding: '8px 18px', borderRadius: '2px',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                  }}
                >
                  Modifier les options
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: '#C9A450', border: 'none', color: '#07090E',
                  padding: '8px 22px', borderRadius: '2px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function CampusTab({ actif, label, compteur, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: actif ? '2px solid #C9A450' : '2px solid transparent',
        color: actif ? '#C9A450' : '#4D6A7A',
        cursor: 'pointer',
        padding: '10px 18px',
        fontSize: '13px',
        fontWeight: actif ? 600 : 400,
        fontFamily: 'inherit',
        transition: 'color 0.15s, border-color 0.15s',
        marginBottom: '-1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={e => { if (!actif) e.currentTarget.style.color = '#8AACBA' }}
      onMouseLeave={e => { if (!actif) e.currentTarget.style.color = '#4D6A7A' }}
    >
      {label}
      <span style={{
        fontSize: '10px',
        background: actif ? 'rgba(201,164,80,0.15)' : 'rgba(60,80,95,0.2)',
        color: actif ? '#C9A450' : '#3D5766',
        padding: '1px 7px',
        borderRadius: '8px',
        fontWeight: 500,
      }}>
        {compteur}
      </span>
    </button>
  )
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: 'rgba(10,15,22,0.6)', border: '1px solid rgba(201,164,80,0.09)',
      borderRadius: '2px', padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ color, fontSize: '22px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{value}</div>
      <div style={{ color: '#3D5766', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function OptionToggle({ checked, onChange, label, desc, warn }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '10px 12px', borderRadius: '2px', cursor: 'pointer',
        border: `1px solid ${checked ? (warn ? 'rgba(220,53,69,0.3)' : 'rgba(201,164,80,0.25)') : 'rgba(201,164,80,0.1)'}`,
        background: checked ? (warn ? 'rgba(220,53,69,0.04)' : 'rgba(201,164,80,0.04)') : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: '14px', height: '14px', flexShrink: 0, marginTop: '2px',
        border: `1px solid ${checked ? (warn ? '#DC3545' : '#C9A450') : 'rgba(201,164,80,0.25)'}`,
        borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? (warn ? '#DC3545' : '#C9A450') : 'transparent',
        transition: 'all 0.15s',
      }}>
        {checked && <svg width="9" height="9" viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" stroke="#07090E" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
      </div>
      <div>
        <div style={{ fontSize: '13px', color: checked ? '#EDE8DC' : '#6A8A9A', fontWeight: checked ? 500 : 400 }}>
          {label}
        </div>
        <div style={{ fontSize: '11.5px', color: '#3D5766', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Icônes SVG ────────────────────────────────────────────────────────────────
const IcoPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IcoGen   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IcoGrid  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IcoPDF   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
