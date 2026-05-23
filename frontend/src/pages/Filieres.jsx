import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const DEF_FIL = { nom: '', code: '', effectif: '', departement: '', campus: '' }
const DEF_NIV = { nom: 'L1', effectif: '', filiere: '' }
const NIVEAUX_OPTS = ['L1', 'L2', 'L3', 'M1', 'M2']

export default function Filieres() {
  const [filieres, setFilieres] = useState([])
  const [depts,    setDepts]    = useState([])
  const [campuses, setCampuses] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Modal filière
  const [fModal,  setFModal]  = useState(false)
  const [fEdit,   setFEdit]   = useState(null)
  const [fForm,   setFForm]   = useState(DEF_FIL)
  const [fSaving, setFSaving] = useState(false)
  const [fError,  setFError]  = useState('')

  // Panel niveaux
  const [nPanel,   setNPanel]   = useState(null)   // filière sélectionnée
  const [niveaux,  setNiveaux]  = useState([])
  const [nLoading, setNLoading] = useState(false)
  const [nModal,   setNModal]   = useState(false)
  const [nEdit,    setNEdit]    = useState(null)
  const [nForm,    setNForm]    = useState(DEF_NIV)
  const [nSaving,  setNSaving]  = useState(false)
  const [nError,   setNError]   = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [f, d, c] = await Promise.all([
        api.get('/filieres/?page_size=200'),
        api.get('/departements/?page_size=200'),
        api.get('/campus/?page_size=200'),
      ])
      setFilieres(f.data.results)
      setDepts(d.data.results)
      setCampuses(c.data.results ?? c.data)
    } finally { setLoading(false) }
  }

  /* ── FILIÈRES CRUD ─────────────────────────────────── */
  function openCreateF() { setFEdit(null); setFForm({ ...DEF_FIL, campus: campuses[0]?.id ?? '' }); setFError(''); setFModal(true) }
  function openEditF(f)  { setFEdit(f); setFForm({ nom: f.nom, code: f.code, effectif: f.effectif, departement: f.departement, campus: f.campus ?? '' }); setFError(''); setFModal(true) }

  async function saveF(e) {
    e.preventDefault(); setFSaving(true); setFError('')
    try {
      const payload = { ...fForm, code: fForm.code.toUpperCase() }
      if (fEdit) await api.put(`/filieres/${fEdit.id}/`, payload)
      else       await api.post('/filieres/', payload)
      await loadAll(); setFModal(false)
    } catch (err) {
      const d = err.response?.data
      setFError(d?.code?.[0] ?? d?.nom?.[0] ?? d?.detail ?? 'Erreur.')
    } finally { setFSaving(false) }
  }

  async function deleteF(id) {
    if (!confirm('Supprimer cette filière ? Ses niveaux et matières seront supprimés.')) return
    try { await api.delete(`/filieres/${id}/`); await loadAll(); if (nPanel?.id === id) setNPanel(null) }
    catch { alert('Erreur lors de la suppression.') }
  }

  /* ── NIVEAUX CRUD ──────────────────────────────────── */
  async function openNiveaux(filiere) {
    setNPanel(filiere); setNLoading(true); setNModal(false)
    try { const { data } = await api.get(`/niveaux/?filiere=${filiere.id}&page_size=200`); setNiveaux(data.results) }
    finally { setNLoading(false) }
  }

  function openCreateN() { setNEdit(null); setNForm({ ...DEF_NIV, filiere: nPanel.id }); setNError(''); setNModal(true) }
  function openEditN(n)  { setNEdit(n); setNForm({ nom: n.nom, effectif: n.effectif, filiere: n.filiere }); setNError(''); setNModal(true) }

  async function saveN(e) {
    e.preventDefault(); setNSaving(true); setNError('')
    try {
      if (nEdit) await api.put(`/niveaux/${nEdit.id}/`, nForm)
      else       await api.post('/niveaux/', nForm)
      await openNiveaux(nPanel)
      setNModal(false)
    } catch (err) {
      const d = err.response?.data
      setNError(d?.non_field_errors?.[0] ?? d?.detail ?? 'Erreur.')
    } finally { setNSaving(false) }
  }

  async function deleteN(id) {
    if (!confirm('Supprimer ce niveau ?')) return
    try { await api.delete(`/niveaux/${id}/`); await openNiveaux(nPanel) }
    catch { alert('Impossible de supprimer : des matières utilisent ce niveau.') }
  }

  const ff = (key) => (e) => setFForm(v => ({ ...v, [key]: e.target.value }))
  const fn = (key) => (e) => setNForm(v => ({ ...v, [key]: e.target.value }))

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Filières &amp; Niveaux
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>{filieres.length} filière{filieres.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreateF}><IcoPlus /> Nouvelle filière</button>
      </div>

      {/* Layout deux colonnes si un panel niveaux est ouvert */}
      <div style={{ display: 'grid', gridTemplateColumns: nPanel ? '1fr 340px' : '1fr', gap: '20px' }}>

        {/* Table filières */}
        <div style={{ background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
          ) : (
            <table className="admin-table page-table">
              <thead>
                <tr><th>Code</th><th>Filière</th><th>Département</th><th>Effectif</th><th>Niveaux</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filieres.map(f => (
                  <tr key={f.id} style={nPanel?.id === f.id ? { background: 'rgba(201,164,80,0.04)' } : {}}>
                    <td><span className="badge badge-gold">{f.code}</span></td>
                    <td style={{ color: '#EDE8DC', fontWeight: 500 }}>{f.nom}</td>
                    <td style={{ color: '#4D6A7A' }}>{f.departement_nom}</td>
                    <td style={{ fontSize: '12px', color: '#4D8A9A' }}>
                      {f.campus_nom ? `${f.campus_nom}` : <span style={{ color: '#2A4555' }}>—</span>}
                      {f.campus_ville && <span style={{ color: '#3D5766', display: 'block', fontSize: '11px' }}>{f.campus_ville}</span>}
                    </td>
                    <td>{f.effectif}</td>
                    <td>
                      <button
                        className="btn-icon btn-icon-view"
                        onClick={() => openNiveaux(f)}
                        title="Gérer les niveaux"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: nPanel?.id === f.id ? '#C9A450' : undefined }}
                      >
                        <IcoLayers />
                        <span style={{ fontSize: '12px' }}>{f.niveaux?.length ?? 0}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon btn-icon-edit"  onClick={() => openEditF(f)}    title="Modifier"><IcoEdit /></button>
                      <button className="btn-icon btn-icon-delete" onClick={() => deleteF(f.id)} title="Supprimer"><IcoTrash /></button>
                    </td>
                  </tr>
                ))}
                {filieres.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#2E4050', padding: '40px' }}>Aucune filière enregistrée.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel niveaux */}
        {nPanel && (
          <div style={{ background: 'rgba(10,15,22,0.9)', border: '1px solid rgba(201,164,80,0.12)', borderRadius: '3px', overflow: 'hidden', alignSelf: 'start' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(201,164,80,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: '#C9A450', margin: '0 0 2px', fontWeight: 600 }}>
                  {nPanel.code}
                </p>
                <p style={{ fontSize: '10px', color: '#3D5766', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Niveaux</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-primary" onClick={openCreateN} style={{ padding: '6px 12px', fontSize: '10px' }}><IcoPlus /></button>
                <button className="btn-icon" onClick={() => setNPanel(null)} style={{ color: '#3D5766' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {nLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#3D5766', fontSize: '13px' }}>Chargement…</div>
            ) : (
              <table className="admin-table">
                <thead><tr><th>Niveau</th><th>Effectif</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {niveaux.map(n => (
                    <tr key={n.id}>
                      <td><span className="badge badge-blue">{n.nom}</span></td>
                      <td>{n.effectif} étudiants</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon btn-icon-edit"  onClick={() => openEditN(n)}    title="Modifier"><IcoEdit /></button>
                        <button className="btn-icon btn-icon-delete" onClick={() => deleteN(n.id)} title="Supprimer"><IcoTrash /></button>
                      </td>
                    </tr>
                  ))}
                  {niveaux.length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: 'center', color: '#2E4050', padding: '20px', fontSize: '12px' }}>Aucun niveau.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal filière */}
      {fModal && (
        <Modal title={fEdit ? 'Modifier la filière' : 'Nouvelle filière'} onClose={() => setFModal(false)} onSubmit={saveF} saving={fSaving} error={fError}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="form-label">Code (ex : TIC)</label>
              <input className="admin-input" value={fForm.code} onChange={ff('code')} placeholder="TIC" maxLength={10} required style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="form-label">Nom de la filière</label>
              <input className="admin-input" value={fForm.nom} onChange={ff('nom')} placeholder="Licence Informatique" required />
            </div>
            <div>
              <label className="form-label">Effectif global</label>
              <input className="admin-input" type="number" min="0" value={fForm.effectif} onChange={ff('effectif')} placeholder="150" required />
            </div>
            <div>
              <label className="form-label">Département</label>
              <select className="admin-select" value={fForm.departement} onChange={ff('departement')} required>
                <option value="">— Choisir un département —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Campus</label>
              <select className="admin-select" value={fForm.campus} onChange={ff('campus')}>
                <option value="">— Choisir un campus —</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom} ({c.ville})</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal niveau */}
      {nModal && (
        <Modal title={nEdit ? 'Modifier le niveau' : 'Nouveau niveau'} onClose={() => setNModal(false)} onSubmit={saveN} saving={nSaving} error={nError}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="form-label">Niveau</label>
              <select className="admin-select" value={nForm.nom} onChange={fn('nom')} required>
                {NIVEAUX_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Effectif du niveau</label>
              <input className="admin-input" type="number" min="0" value={nForm.effectif} onChange={fn('effectif')} placeholder="80" required />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const IcoPlus   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoEdit   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IcoLayers = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
