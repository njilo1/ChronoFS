import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const ETATS = {
  collecte: { label: 'Collecte',     classe: 'badge-blue' },
  pret:     { label: 'Prêt',         classe: 'badge-gold' },
  genere:   { label: 'Généré',       classe: 'badge-green' },
  publie:   { label: 'Publié',       classe: 'badge-green' },
  archive:  { label: 'Archivé',      classe: 'badge-gray' },
}

export default function Sessions() {
  const [sessions,    setSessions]    = useState([])
  const [active,      setActive]      = useState(null)
  const [dashboard,   setDashboard]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [showModal,   setShowModal]   = useState(false)
  const [error,       setError]       = useState('')

  const navigate = useNavigate()

  /* ── Chargement initial ───────────────────────────────── */
  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sessions/?ordering=-semaine_debut')
      const liste = data.results ?? data
      setSessions(liste)

      // Recherche d'une session active
      const ouverte = liste.find(s => s.etat === 'collecte' || s.etat === 'pret')
      setActive(ouverte ?? null)

      if (ouverte) {
        const dash = await api.get(`/sessions/${ouverte.id}/dashboard/`)
        setDashboard(dash.data)
      } else {
        setDashboard(null)
      }
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Impossible de charger les sessions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])

  /* ── Génération du planning ───────────────────────────── */
  async function genererPlanning() {
    if (!active) return
    if (!confirm(`Lancer la génération du planning pour « ${active.libelle} » ?`)) return

    setGenerating(true)
    setError('')
    try {
      const { data } = await api.post('/emplois/generer/', {
        session_id: active.id,
      })
      alert(
        `Planning généré : ${data.nb_places} créneaux placés` +
        (data.nb_non_places > 0 ? `, ${data.nb_non_places} matières non placées.` : '.')
      )
      charger()
    } catch (e) {
      setError(e.response?.data?.error ?? 'Erreur lors de la génération.')
    } finally {
      setGenerating(false)
    }
  }

  /* ── Publication ──────────────────────────────────────── */
  async function publier(session) {
    if (!confirm(`Publier le planning de « ${session.libelle} » ? Il sera visible par tous.`)) return
    try {
      await api.post(`/sessions/${session.id}/publier/`)
      charger()
    } catch (e) {
      setError(e.response?.data?.error ?? 'Erreur lors de la publication.')
    }
  }

  /* ── Archivage ────────────────────────────────────────── */
  async function archiver(session) {
    if (!confirm(`Archiver « ${session.libelle} » ? Elle restera consultable dans l'historique.`)) return
    try {
      await api.post(`/sessions/${session.id}/archiver/`)
      charger()
    } catch (e) {
      setError(e.response?.data?.error ?? 'Erreur lors de l\'archivage.')
    }
  }

  /* ── Rendu ────────────────────────────────────────────── */
  return (
    <div className="page-wrap" style={{ maxWidth: '1100px' }}>

      {/* En-tête */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: '#C9A450', margin: '0 0 4px' }}>
            Sessions de planification
          </h1>
          <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
            Une session = une semaine. Les chefs de département envoient leur Excel pour la session active.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <IcoPlus /> Nouvelle session
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,53,69,0.07)', borderLeft: '2px solid rgba(220,53,69,0.5)', padding: '10px 14px', borderRadius: '2px', marginBottom: '20px', fontSize: '13px', color: '#D97070' }}>
          {error}
        </div>
      )}

      {loading && <div style={{ color: '#3D5766', fontSize: '13px' }}>Chargement…</div>}

      {/* ── Session active : tableau de bord ──────────────── */}
      {!loading && active && dashboard && (
        <div className="page-card" style={{
          background: 'rgba(10,15,22,0.9)',
          border: '1px solid rgba(201,164,80,0.18)',
          borderRadius: '3px',
          marginBottom: '32px',
          overflow: 'hidden',
        }}>
          {/* En-tête de la session active */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(201,164,80,0.08)',
            background: 'linear-gradient(180deg, rgba(201,164,80,0.04) 0%, transparent 100%)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: '9.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,164,80,0.55)', margin: '0 0 8px' }}>
                Session active
              </p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', color: '#EDE8DC', margin: '0 0 4px', fontWeight: 600 }}>
                {active.libelle}
              </h2>
              <p style={{ color: '#4D6A7A', fontSize: '12.5px', margin: 0 }}>
                Semestre {active.semestre} · {active.annee_academique} · {dashboard.nb_faits}/{dashboard.nb_total} départements ont importé
              </p>
            </div>
            <span className={`badge ${ETATS[active.etat]?.classe ?? 'badge-gray'}`}>
              {ETATS[active.etat]?.label ?? active.etat}
            </span>
          </div>

          {/* Bannière d'alerte si tous prêts */}
          {dashboard.tous_prets && active.etat === 'pret' && (
            <div style={{
              padding: '14px 28px',
              background: 'linear-gradient(90deg, rgba(201,164,80,0.10) 0%, rgba(201,164,80,0.02) 100%)',
              borderBottom: '1px solid rgba(201,164,80,0.18)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(201,164,80,0.15)',
                  border: '1px solid rgba(201,164,80,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#C9A450',
                }}>
                  <IcoCheck />
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#C9A450', fontSize: '13.5px', fontWeight: 500 }}>
                    Tous les départements ont importé leur programme
                  </p>
                  <p style={{ margin: 0, color: '#4D6A7A', fontSize: '12px' }}>
                    Vous pouvez maintenant lancer la génération automatique du planning.
                  </p>
                </div>
              </div>
              <button className="btn-primary" onClick={genererPlanning} disabled={generating}>
                {generating ? 'Génération…' : <>Générer le planning <IcoArrow /></>}
              </button>
            </div>
          )}

          {/* Grille des départements */}
          <div style={{ padding: '24px 28px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,164,80,0.5)', margin: '0 0 14px' }}>
              Suivi des imports par département
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px',
            }}>
              {[...dashboard.importes, ...dashboard.manquants].map(imp => (
                <DeptCard key={imp.id} imp={imp} />
              ))}
            </div>

            {/* Bouton génération même si pas tous prêts (avec avertissement) */}
            {!dashboard.tous_prets && active.etat !== 'genere' && active.etat !== 'publie' && dashboard.nb_faits > 0 && (
              <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(220,150,70,0.06)', border: '1px solid rgba(220,150,70,0.18)', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: '#D9A560', fontSize: '12.5px' }}>
                  ⚠️ {dashboard.nb_manque} département{dashboard.nb_manque > 1 ? 's n\'ont' : ' n\'a'} pas encore importé. La génération sera incomplète.
                </p>
                <button className="btn-ghost" onClick={genererPlanning} disabled={generating}>
                  {generating ? 'Génération…' : 'Générer quand même'}
                </button>
              </div>
            )}

            {/* Si déjà généré, proposer publication */}
            {active.etat === 'genere' && (
              <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(76,175,120,0.07)', border: '1px solid rgba(76,175,120,0.22)', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: '#4CAF78', fontSize: '13px' }}>
                  ✓ Planning généré · {active.nb_emplois_du_temps} emploi{active.nb_emplois_du_temps > 1 ? 's' : ''} du temps créé{active.nb_emplois_du_temps > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost" onClick={() => navigate('/plannings')}>Voir le planning</button>
                  <button className="btn-primary" onClick={() => publier(active)}>Publier</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pas de session active ─────────────────────────── */}
      {!loading && !active && (
        <div className="page-card" style={{
          background: 'rgba(10,15,22,0.6)',
          border: '1px dashed rgba(201,164,80,0.15)',
          borderRadius: '3px',
          padding: '48px 32px',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <p style={{ color: '#4D6A7A', fontSize: '14px', margin: '0 0 16px' }}>
            Aucune session active actuellement.
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <IcoPlus /> Créer la session de la semaine
          </button>
        </div>
      )}

      {/* ── Historique ───────────────────────────────────── */}
      {!loading && sessions.length > 0 && (
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,164,80,0.5)', margin: '0 0 14px' }}>
            Historique des sessions
          </p>
          <div style={{
            background: 'rgba(10,15,22,0.85)',
            border: '1px solid rgba(201,164,80,0.07)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <table className="admin-table page-table">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Semaine</th>
                  <th>Sem.</th>
                  <th>Imports</th>
                  <th>EDT</th>
                  <th>État</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#EDE8DC', fontWeight: 500 }}>{s.libelle}</td>
                    <td style={{ color: '#A0C0D0', fontSize: '12.5px' }}>
                      {formatDate(s.semaine_debut)} → {formatDate(s.semaine_fin)}
                    </td>
                    <td><span className="badge badge-gray">S{s.semestre}</span></td>
                    <td style={{ color: s.tous_importes ? '#4CAF78' : '#D9A560', fontSize: '12.5px' }}>
                      {s.nb_imports_faits}/{s.nb_imports_total}
                    </td>
                    <td style={{ color: '#A0C0D0', fontSize: '12.5px' }}>
                      {s.nb_emplois_du_temps > 0 ? `${s.nb_emplois_du_temps} EDT` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${ETATS[s.etat]?.classe ?? 'badge-gray'}`}>
                        {ETATS[s.etat]?.label ?? s.etat}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.nb_emplois_du_temps > 0 && (
                        <button className="btn-icon btn-icon-view" title="Voir les plannings" onClick={() => navigate('/plannings')}>
                          <IcoEye />
                        </button>
                      )}
                      {s.etat !== 'archive' && (
                        <button className="btn-icon btn-icon-edit" title="Archiver" onClick={() => archiver(s)}>
                          <IcoArchive />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <ModalNouvelleSession
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); charger() }}
        />
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */

function DeptCard({ imp }) {
  const ok = imp.importe
  return (
    <div style={{
      background: ok ? 'rgba(76,175,120,0.05)' : 'rgba(7,9,14,0.6)',
      border: `1px solid ${ok ? 'rgba(76,175,120,0.22)' : 'rgba(201,164,80,0.08)'}`,
      borderLeft: `2px solid ${ok ? '#4CAF78' : 'rgba(201,164,80,0.3)'}`,
      borderRadius: '2px',
      padding: '12px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '10px',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', color: ok ? '#EDE8DC' : '#8AACBC', fontSize: '13px', fontWeight: 500 }}>
          {imp.departement_code}
        </p>
        <p style={{ margin: 0, color: '#3D5766', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ok ? `${imp.nb_matieres} matière${imp.nb_matieres > 1 ? 's' : ''}` : 'En attente'}
        </p>
      </div>
      {ok ? (
        <span style={{
          color: '#4CAF78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(76,175,120,0.12)',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      ) : (
        <span style={{
          color: 'rgba(201,164,80,0.5)', fontSize: '10px', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          ⏳
        </span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */

function ModalNouvelleSession({ onClose, onCreated }) {
  // Calculer le lundi de la semaine prochaine par défaut
  const aujourdhui = new Date()
  const lundi = new Date(aujourdhui)
  const jourSemaine = (aujourdhui.getDay() + 6) % 7
  lundi.setDate(aujourdhui.getDate() - jourSemaine + 7)
  const samedi = new Date(lundi)
  samedi.setDate(lundi.getDate() + 5)

  const fmt = d => d.toISOString().split('T')[0]

  const [debut,            setDebut]            = useState(fmt(lundi))
  const [fin,              setFin]              = useState(fmt(samedi))
  const [semestre,         setSemestre]         = useState('1')
  const [anneeAcademique,  setAnneeAcademique]  = useState(`${aujourdhui.getFullYear()}-${aujourdhui.getFullYear() + 1}`)
  const [erreur,           setErreur]           = useState('')
  const [loading,          setLoading]          = useState(false)

  function libelleAuto() {
    const d = new Date(debut)
    const f = new Date(fin)
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
    if (d.getMonth() === f.getMonth()) {
      return `Semaine du ${d.getDate()} au ${f.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`
    }
    return `Semaine du ${d.getDate()} ${mois[d.getMonth()]} au ${f.getDate()} ${mois[f.getMonth()]} ${d.getFullYear()}`
  }

  async function creer() {
    setLoading(true); setErreur('')
    try {
      await api.post('/sessions/', {
        libelle:          libelleAuto(),
        semaine_debut:    debut,
        semaine_fin:      fin,
        semestre,
        annee_academique: anneeAcademique,
      })
      onCreated()
    } catch (e) {
      setErreur(e.response?.data?.detail ?? JSON.stringify(e.response?.data ?? {}) ?? 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(201,164,80,0.08)' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: '#C9A450', margin: 0, fontWeight: 600 }}>
            Nouvelle session de planification
          </h2>
          <p style={{ color: '#4D6A7A', fontSize: '12px', margin: '4px 0 0' }}>
            Une ligne d'import vide sera créée pour chaque département.
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Début de semaine</label>
              <input type="date" className="admin-input" value={debut} onChange={e => setDebut(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Fin de semaine</label>
              <input type="date" className="admin-input" value={fin} onChange={e => setFin(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Semestre</label>
              <select className="admin-select" value={semestre} onChange={e => setSemestre(e.target.value)}>
                <option value="1">Semestre 1</option>
                <option value="2">Semestre 2</option>
              </select>
            </div>
            <div>
              <label className="form-label">Année académique</label>
              <input className="admin-input" value={anneeAcademique} onChange={e => setAnneeAcademique(e.target.value)} placeholder="2025-2026" />
            </div>
          </div>

          <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(201,164,80,0.04)', border: '1px solid rgba(201,164,80,0.1)', borderRadius: '2px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,164,80,0.5)', margin: '0 0 4px' }}>
              Libellé auto-généré
            </p>
            <p style={{ margin: 0, color: '#EDE8DC', fontSize: '13.5px', fontFamily: "'Cormorant Garamond', serif" }}>
              {libelleAuto()}
            </p>
          </div>

          {erreur && (
            <div style={{ background: 'rgba(220,53,69,0.07)', borderLeft: '2px solid rgba(220,53,69,0.5)', padding: '10px 14px', borderRadius: '2px', marginBottom: '16px', fontSize: '12.5px', color: '#D97070' }}>
              {erreur}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn-ghost" onClick={onClose} disabled={loading}>Annuler</button>
            <button className="btn-primary" onClick={creer} disabled={loading}>
              {loading ? 'Création…' : 'Créer la session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/* Icônes */
const IcoPlus    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoArrow   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
const IcoCheck   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoEye     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoArchive = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
