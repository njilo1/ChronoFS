import { useState, useEffect } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'

const GRADES = [{ v: 'Dr', l: 'Docteur' }, { v: 'Pr', l: 'Professeur' }, { v: 'Ing', l: 'Ingénieur' }, { v: 'M', l: 'M. / Mme' }]
const DEFAULT = { nom: '', prenom: '', grade: 'Dr', email: '', specialite: '', est_actif: true, departements: [] }

export default function Enseignants() {
  const [items,   setItems]   = useState([])
  const [depts,   setDepts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [edit,    setEdit]    = useState(null)
  const [form,    setForm]    = useState(DEFAULT)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [e, d] = await Promise.all([
        api.get('/enseignants/?page_size=200'),
        api.get('/departements/?page_size=200'),
      ])
      setItems(e.data.results)
      setDepts(d.data.results)
    } finally { setLoading(false) }
  }

  function openCreate() { setEdit(null); setForm(DEFAULT); setError(''); setModal(true) }
  function openEdit(item) {
    setEdit(item)
    setForm({ nom: item.nom, prenom: item.prenom, grade: item.grade, email: item.email, specialite: item.specialite, est_actif: item.est_actif, departements: item.departements })
    setError(''); setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (edit) await api.put(`/enseignants/${edit.id}/`, form)
      else      await api.post('/enseignants/', form)
      await loadAll(); setModal(false)
    } catch (err) {
      const d = err.response?.data
      setError(d?.email?.[0] ?? d?.detail ?? JSON.stringify(d) ?? 'Erreur.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet enseignant ?')) return
    try { await api.delete(`/enseignants/${id}/`); await loadAll() }
    catch { alert('Erreur lors de la suppression.') }
  }

  const f = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  function handleDeptsChange(e) {
    const selected = Array.from(e.target.selectedOptions, o => parseInt(o.value))
    setForm(v => ({ ...v, departements: selected }))
  }

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Enseignants
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>{items.length} enseignant{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><IcoPlus /> Nouvel enseignant</button>
      </div>

      <div style={{ background: 'rgba(10,15,22,0.8)', border: '1px solid rgba(201,164,80,0.09)', borderRadius: '3px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3D5766' }}>Chargement…</div>
        ) : (
          <table className="admin-table page-table">
            <thead>
              <tr><th>Grade</th><th>Nom</th><th>Email</th><th>Départements</th><th>Statut</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td><span className="badge badge-gold">{e.grade}</span></td>
                  <td style={{ color: '#EDE8DC', fontWeight: 500 }}>{e.nom} {e.prenom}</td>
                  <td style={{ color: '#4D6A7A', fontSize: '13px' }}>{e.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {e.departements_detail?.map(d => (
                        <span key={d.id} className="badge badge-blue">{d.code}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={e.est_actif ? 'badge badge-green' : 'badge badge-gray'}>
                      {e.est_actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon btn-icon-edit"  onClick={() => openEdit(e)}    title="Modifier"><IcoEdit /></button>
                    <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(e.id)} title="Supprimer"><IcoTrash /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#2E4050', padding: '40px' }}>Aucun enseignant enregistré.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={edit ? 'Modifier l\'enseignant' : 'Nouvel enseignant'} onClose={() => setModal(false)} onSubmit={handleSave} saving={saving} error={error} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Nom</label>
              <input className="admin-input" value={form.nom} onChange={f('nom')} placeholder="KENGNI" required />
            </div>
            <div>
              <label className="form-label">Prénom</label>
              <input className="admin-input" value={form.prenom} onChange={f('prenom')} placeholder="Olga" required />
            </div>
            <div>
              <label className="form-label">Grade</label>
              <select className="admin-select" value={form.grade} onChange={f('grade')}>
                {GRADES.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="admin-input" type="email" value={form.email} onChange={f('email')} placeholder="kengni@ueb.cm" required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Spécialité</label>
              <input className="admin-input" value={form.specialite} onChange={f('specialite')} placeholder="Génie Logiciel, Réseaux…" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Départements (Ctrl+clic pour sélection multiple)</label>
              <select className="admin-select" multiple value={form.departements.map(String)} onChange={handleDeptsChange}>
                {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
              </select>
              <p style={{ fontSize: '11px', color: '#2A4050', margin: '5px 0 0' }}>
                Un enseignant peut appartenir à plusieurs départements (réalité UEB).
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="admin-checkbox">
                <input type="checkbox" checked={form.est_actif} onChange={e => setForm(v => ({ ...v, est_actif: e.target.checked }))} />
                Enseignant actif ce semestre
              </label>
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
