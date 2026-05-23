import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const DEFAULT = { nom: '', capacite: '', campus: '', est_disponible: true }

export default function Salles() {
  const [items,    setItems]    = useState([])
  const [campuses, setCampuses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [edit,     setEdit]     = useState(null)
  const [form,     setForm]     = useState(DEFAULT)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [salles, camps] = await Promise.all([
        api.get('/salles/?page_size=200'),
        api.get('/campus/?page_size=200'),
      ])
      setItems(salles.data.results)
      setCampuses(camps.data.results ?? camps.data)
    } finally { setLoading(false) }
  }

  function openCreate() {
    setEdit(null)
    setForm({ ...DEFAULT, campus: campuses[0]?.id ?? '' })
    setError(''); setModal(true)
  }
  function openEdit(item) {
    setEdit(item)
    setForm({ nom: item.nom, capacite: item.capacite, campus: item.campus ?? '', est_disponible: item.est_disponible })
    setError(''); setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (edit) await api.put(`/salles/${edit.id}/`, form)
      else      await api.post('/salles/', form)
      await load(); setModal(false)
    } catch (err) {
      setError(err.response?.data?.nom?.[0] ?? err.response?.data?.detail ?? "Erreur lors de l'enregistrement.")
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette salle ?')) return
    try { await api.delete(`/salles/${id}/`); await load() }
    catch { alert('Impossible de supprimer : des créneaux utilisent cette salle.') }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  // Grouper les salles par campus
  const grouped = {}
  items.forEach(s => {
    const key = s.campus_nom ?? 'Sans campus'
    if (!grouped[key]) grouped[key] = { ville: s.campus_ville ?? '', salles: [] }
    grouped[key].salles.push(s)
  })

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Salles
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
            {items.length} salle{items.length !== 1 ? 's' : ''} — {campuses.length} campus
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouvelle salle</button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
      ) : (
        Object.entries(grouped).map(([campusNom, { ville, salles }]) => (
          <div key={campusNom} style={{ marginBottom: '24px' }}>
            {/* En-tête groupe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', color: '#C9A450', fontWeight: 600,
              }}>{campusNom}</span>
              {ville && <span style={{ fontSize: '11px', color: '#3D5766' }}>{ville}</span>}
              <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{salles.length} salle{salles.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px', overflow: 'hidden' }}>
              <table className="admin-table page-table">
                <thead>
                  <tr><th>Nom</th><th>Capacité</th><th>Disponibilité</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {salles.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: '#EDE8DC', fontWeight: 500 }}>Salle {s.nom}</td>
                      <td>{s.capacite} places</td>
                      <td>
                        <span className={s.est_disponible ? 'badge badge-green' : 'badge badge-red'}>
                          {s.est_disponible ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon btn-icon-edit"   onClick={() => openEdit(s)}       title="Modifier"><IcoEdit /></button>
                        <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(s.id)} title="Supprimer"><IcoTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#2E4050', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px' }}>
          Aucune salle. Créez d'abord des campus dans la section Gestion → Campus.
        </div>
      )}

      {modal && (
        <Modal title={edit ? 'Modifier la salle' : 'Nouvelle salle'} onClose={() => setModal(false)} onSubmit={handleSave} saving={saving} error={error}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="form-label">Nom de la salle</label>
              <input className="admin-input" value={form.nom} onChange={f('nom')} placeholder="Ex : A, B, E, Sur le terrain…" required />
            </div>
            <div>
              <label className="form-label">Capacité (places)</label>
              <input className="admin-input" type="number" min="1" value={form.capacite} onChange={f('capacite')} placeholder="100" required />
            </div>
            <div>
              <label className="form-label">Campus</label>
              <select className="admin-select" value={form.campus} onChange={f('campus')} required>
                <option value="">— Sélectionnez un campus —</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.nom} ({c.ville})</option>
                ))}
              </select>
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={form.est_disponible} onChange={e => setForm(v => ({ ...v, est_disponible: e.target.checked }))} />
              Salle disponible
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

const IcoPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
