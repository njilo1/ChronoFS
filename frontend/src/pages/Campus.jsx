import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const DEFAULT = { nom: '', code: '', ville: '', adresse: '', est_principal: false }

export default function Campus() {
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
    try { const { data } = await api.get('/campus/?page_size=200'); setItems(data.results ?? data) }
    finally { setLoading(false) }
  }

  function openCreate() { setEdit(null); setForm(DEFAULT); setError(''); setModal(true) }
  function openEdit(item) {
    setEdit(item)
    setForm({ nom: item.nom, code: item.code, ville: item.ville, adresse: item.adresse ?? '', est_principal: item.est_principal })
    setError(''); setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (edit) await api.put(`/campus/${edit.id}/`, form)
      else      await api.post('/campus/', form)
      await load(); setModal(false)
    } catch (err) {
      const d = err.response?.data
      setError(d?.code?.[0] ?? d?.nom?.[0] ?? d?.detail ?? "Erreur lors de l'enregistrement.")
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce campus ? Les salles et filières associées seront dissociées.')) return
    try { await api.delete(`/campus/${id}/`); await load() }
    catch { alert('Erreur lors de la suppression.') }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  // Grouper par ville
  const villes = [...new Set(items.map(c => c.ville))]

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Campus
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
            Sites physiques de la Faculté des Sciences — {villes.length} ville{villes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouveau campus</button>
      </div>

      {/* Cartes campus groupées par ville */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
      ) : (
        villes.map(ville => (
          <div key={ville} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <IcoMap />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: '#C9A450', fontWeight: 600 }}>
                {ville}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {items.filter(c => c.ville === ville).map(c => (
                <div key={c.id} className="page-card" style={{
                  background: 'rgba(10,15,22,0.8)', border: `1px solid ${c.est_principal ? 'rgba(201,164,80,0.3)' : 'rgba(201,164,80,0.09)'}`,
                  borderRadius: '3px', padding: '18px 20px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {c.est_principal && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                      background: 'linear-gradient(90deg, #C9A450 0%, rgba(201,164,80,0) 100%)',
                    }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{
                        fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: '#C9A450', fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}>{c.code}</span>
                      {c.est_principal && (
                        <span className="badge badge-gold" style={{ marginLeft: '8px', fontSize: '9px' }}>Principal</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-icon btn-icon-edit"   onClick={() => openEdit(c)}       title="Modifier"><IcoEdit /></button>
                      <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(c.id)} title="Supprimer"><IcoTrash /></button>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 8px', color: '#EDE8DC', fontSize: '14px', fontWeight: 500 }}>{c.nom}</p>
                  {c.adresse && <p style={{ margin: '0 0 10px', color: '#4D6A7A', fontSize: '12px' }}>{c.adresse}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <span className="badge badge-gray">{c.nb_salles} salle{c.nb_salles !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {!loading && items.length === 0 && (
        <div style={{
          background: 'rgba(201,164,80,0.05)', border: '1px solid rgba(201,164,80,0.14)',
          borderRadius: '3px', padding: '32px', textAlign: 'center',
        }}>
          <p style={{ color: '#C9A450', margin: '0 0 8px', fontFamily: "'Cormorant Garamond', serif", fontSize: '18px' }}>Aucun campus configuré</p>
          <p style={{ color: '#3D5766', margin: 0, fontSize: '13px' }}>
            Créez les campus de votre faculté (Ebolowa et Monatélé).<br />
            Les campus créés par défaut sont : CPF (Ebolowa), LYC, CRA et MON (Monatélé).
          </p>
        </div>
      )}

      {modal && (
        <Modal title={edit ? 'Modifier le campus' : 'Nouveau campus'} onClose={() => setModal(false)} onSubmit={handleSave} saving={saving} error={error}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Code court</label>
                <input
                  className="admin-input" value={form.code}
                  onChange={e => setForm(v => ({ ...v, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex : CPF, MON, LYC" maxLength="10" required
                />
              </div>
              <div>
                <label className="form-label">Ville</label>
                <input className="admin-input" value={form.ville} onChange={f('ville')} placeholder="Ebolowa ou Monatélé" required />
              </div>
            </div>
            <div>
              <label className="form-label">Nom complet</label>
              <input className="admin-input" value={form.nom} onChange={f('nom')} placeholder="Ex : Campus Principal FS" required />
            </div>
            <div>
              <label className="form-label">Adresse (facultatif)</label>
              <input className="admin-input" value={form.adresse} onChange={f('adresse')} placeholder="Ex : Quartier Nkol-Mvolan…" />
            </div>
            <label className="admin-checkbox">
              <input type="checkbox" checked={form.est_principal} onChange={e => setForm(v => ({ ...v, est_principal: e.target.checked }))} />
              Campus principal de la Faculté
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
const IcoMap   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A450" strokeWidth="1.75" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
