import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const DEFAULT = { nom: '', code: '' }

export default function Departements() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [edit,    setEdit]    = useState(null)
  const [form,    setForm]    = useState(DEFAULT)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/departements/?page_size=200'); setItems(data.results) }
    finally { setLoading(false) }
  }

  function openCreate() { setEdit(null); setForm(DEFAULT); setError(''); setModal(true) }
  function openEdit(item) { setEdit(item); setForm({ nom: item.nom, code: item.code }); setError(''); setModal(true) }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, code: form.code.toUpperCase() }
      if (edit) await api.put(`/departements/${edit.id}/`, payload)
      else      await api.post('/departements/', payload)
      await load(); setModal(false)
    } catch (err) {
      const d = err.response?.data
      setError(d?.nom?.[0] ?? d?.code?.[0] ?? d?.detail ?? 'Erreur lors de l\'enregistrement.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce département ? Toutes ses filières seront supprimées.')) return
    try { await api.delete(`/departements/${id}/`); await load() }
    catch { alert('Erreur lors de la suppression.') }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Départements
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>{items.length} département{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouveau département</button>
      </div>

      <div style={{ background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
        ) : (
          <table className="admin-table page-table">
            <thead>
              <tr><th>Code</th><th>Nom</th><th>Filières</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id}>
                  <td><span className="badge badge-gold">{d.code}</span></td>
                  <td style={{ color: '#EDE8DC', fontWeight: 500 }}>{d.nom}</td>
                  <td style={{ color: '#4D6A7A' }}>{d.filieres?.length ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon btn-icon-edit"  onClick={() => openEdit(d)}    title="Modifier"><IcoEdit /></button>
                    <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(d.id)} title="Supprimer"><IcoTrash /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#2E4050', padding: '40px' }}>Aucun département enregistré.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={edit ? 'Modifier le département' : 'Nouveau département'} onClose={() => setModal(false)} onSubmit={handleSave} saving={saving} error={error}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="form-label">Code (ex : TIC)</label>
              <input className="admin-input" value={form.code} onChange={f('code')} placeholder="TIC" maxLength={10} required style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="form-label">Nom complet</label>
              <input className="admin-input" value={form.nom} onChange={f('nom')} placeholder="Technologies de l'Information et de la Communication" required />
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
