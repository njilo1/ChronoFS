import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const TYPES = [{ v: 'CM', l: 'Cours Magistral' }, { v: 'TD', l: 'Travaux Dirigés' }, { v: 'TP', l: 'Travaux Pratiques' }]
const DEFAULT = { code: '', intitule: '', type_seance: 'CM', volume_horaire: 2.5, niveau: '', enseignant: '' }

export default function Matieres() {
  const [items,        setItems]        = useState([])
  const [niveaux,      setNiveaux]      = useState([])
  const [enseignants,  setEnseignants]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [edit,         setEdit]         = useState(null)
  const [form,         setForm]         = useState(DEFAULT)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [m, n, e] = await Promise.all([
        api.get('/matieres/?page_size=200'),
        api.get('/niveaux/?page_size=200'),
        api.get('/enseignants/?page_size=200'),
      ])
      setItems(m.data.results)
      setNiveaux(n.data.results)
      setEnseignants(e.data.results)
    } finally { setLoading(false) }
  }

  function openCreate() { setEdit(null); setForm(DEFAULT); setError(''); setModal(true) }
  function openEdit(item) {
    setEdit(item)
    setForm({ code: item.code, intitule: item.intitule, type_seance: item.type_seance, volume_horaire: item.volume_horaire, niveau: item.niveau, enseignant: item.enseignant ?? '' })
    setError(''); setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, code: form.code.toUpperCase(), enseignant: form.enseignant || null }
      if (edit) await api.put(`/matieres/${edit.id}/`, payload)
      else      await api.post('/matieres/', payload)
      await loadAll(); setModal(false)
    } catch (err) {
      const d = err.response?.data
      setError(d?.code?.[0] ?? d?.detail ?? JSON.stringify(d) ?? 'Erreur.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette matière ?')) return
    try { await api.delete(`/matieres/${id}/`); await loadAll() }
    catch { alert('Erreur lors de la suppression.') }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  const filtered = search
    ? items.filter(m => m.code.toLowerCase().includes(search.toLowerCase()) || m.intitule.toLowerCase().includes(search.toLowerCase()))
    : items

  const TYPE_BADGE = { CM: 'badge-gold', TD: 'badge-blue', TP: 'badge-green' }

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Matières
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>{items.length} matière{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            className="admin-input"
            style={{ width: '220px', padding: '8px 14px' }}
            placeholder="Rechercher code ou intitulé…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouvelle matière</button>
        </div>
      </div>

      <div style={{ background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
        ) : (
          <table className="admin-table page-table">
            <thead>
              <tr><th>Code</th><th>Intitulé</th><th>Type</th><th>Filière · Niveau</th><th>Enseignant</th><th>VH/sem.</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td><span className="badge badge-gold" style={{ fontFamily: 'monospace' }}>{m.code}</span></td>
                  <td style={{ color: '#EDE8DC', maxWidth: '220px' }}>{m.intitule}</td>
                  <td><span className={`badge ${TYPE_BADGE[m.type_seance]}`}>{m.type_seance}</span></td>
                  <td style={{ color: '#4D6A7A', fontSize: '12.5px' }}>{m.filiere_code} · {m.niveau_nom}</td>
                  <td style={{ color: '#5A8090', fontSize: '12.5px' }}>{m.enseignant_nom ?? <span style={{ color: '#2E4050' }}>—</span>}</td>
                  <td style={{ color: '#4D6A7A' }}>{m.volume_horaire}h</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon btn-icon-edit"  onClick={() => openEdit(m)}    title="Modifier"><IcoEdit /></button>
                    <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(m.id)} title="Supprimer"><IcoTrash /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#2E4050', padding: '40px' }}>
                  {search ? 'Aucun résultat pour cette recherche.' : 'Aucune matière enregistrée.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={edit ? 'Modifier la matière' : 'Nouvelle matière'} onClose={() => setModal(false)} onSubmit={handleSave} saving={saving} error={error} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Code officiel</label>
              <input className="admin-input" value={form.code} onChange={f('code')} placeholder="TIC224" maxLength={20} required style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="form-label">Type de séance</label>
              <select className="admin-select" value={form.type_seance} onChange={f('type_seance')}>
                {TYPES.map(t => <option key={t.v} value={t.v}>{t.v} — {t.l}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Intitulé complet</label>
              <input className="admin-input" value={form.intitule} onChange={f('intitule')} placeholder="Analyse & Conception des Systèmes d'Information" required />
            </div>
            <div>
              <label className="form-label">Filière · Niveau</label>
              <select className="admin-select" value={form.niveau} onChange={f('niveau')} required>
                <option value="">— Choisir —</option>
                {niveaux.map(n => <option key={n.id} value={n.id}>{n.filiere_code} {n.nom} ({n.effectif} étudiants)</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Volume horaire / semaine (h)</label>
              <input className="admin-input" type="number" min="0.5" step="0.5" value={form.volume_horaire} onChange={f('volume_horaire')} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Enseignant (optionnel)</label>
              <select className="admin-select" value={form.enseignant} onChange={f('enseignant')}>
                <option value="">— Non assigné —</option>
                {enseignants.map(e => <option key={e.id} value={e.id}>{e.grade}. {e.nom} {e.prenom}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const IcoPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
