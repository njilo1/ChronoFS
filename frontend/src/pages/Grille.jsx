import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const JOURS_LABELS = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi',
}
const PLAGES = [
  { debut: '07:30', fin: '10:00' },
  { debut: '10:15', fin: '12:45' },
  { debut: '13:00', fin: '15:30' },
  { debut: '15:45', fin: '18:15' },
]

function computeDates(semaine_debut) {
  if (!semaine_debut) return {}
  const d = new Date(semaine_debut + 'T00:00:00')
  const MOIS = ['jan', 'fév', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']
  const result = {}
  JOURS.forEach((j, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    result[j] = `${day.getDate()} ${MOIS[day.getMonth()]}`
  })
  return result
}

// Identifie une classe de manière stable : filière + niveau
function classeKey(c) {
  return `${c.filiere_code || '—'}__${c.niveau_nom || '—'}`
}
function classeLabel(c) {
  return `${c.filiere_code || '—'} ${c.niveau_nom || ''}`.trim()
}

export default function Grille() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [edt,      setEdt]      = useState(null)
  const [creneaux, setCreneaux] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const sectionRefs = useRef({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: edtData }, { data: creData }] = await Promise.all([
          api.get(`/emplois-du-temps/${id}/`),
          api.get(`/creneaux/?emploi_du_temps=${id}&page_size=500`),
        ])
        setEdt(edtData)
        setCreneaux(creData.results ?? creData)
      } catch {
        setError('Impossible de charger cet emploi du temps.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Regroupe les créneaux par classe puis trie classes et grilles
  const classes = useMemo(() => {
    const map = new Map()
    creneaux.forEach(c => {
      const k = classeKey(c)
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: classeLabel(c),
          filiere_code: c.filiere_code || '—',
          niveau_nom: c.niveau_nom || '',
          creneaux: [],
        })
      }
      map.get(k).creneaux.push(c)
    })
    // Tri : par code filière, puis par nom de niveau (L1 < L2 < L3 < M1 < M2)
    const ordreNiveau = { L1: 1, L2: 2, L3: 3, M1: 4, M2: 5 }
    return Array.from(map.values()).sort((a, b) => {
      if (a.filiere_code !== b.filiere_code)
        return a.filiere_code.localeCompare(b.filiere_code)
      return (ordreNiveau[a.niveau_nom] || 99) - (ordreNiveau[b.niveau_nom] || 99)
    })
  }, [creneaux])

  const dates = useMemo(() => computeDates(edt?.semaine_debut), [edt?.semaine_debut])

  function handleExportPDF() {
    window.open(`http://localhost:8000/api/emplois-du-temps/${id}/export-pdf/`, '_blank')
  }

  function scrollToClasse(key) {
    const el = sectionRefs.current[key]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07090E', color: '#3D5766', fontFamily: "'DM Sans', sans-serif" }}>
      Chargement de la grille…
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07090E', color: '#DC3545', fontFamily: "'DM Sans', sans-serif" }}>
      {error}
    </div>
  )

  const campus = edt?.campus_nom ? `${edt.campus_nom} – ${edt.campus_ville}` : 'Tous campus'

  return (
    <div style={{
      minHeight: '100vh', background: '#07090E',
      fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC',
    }}>

      {/* ── Barre supérieure ───────────────────────────────────────────────── */}
      <div style={{
        background: '#090D14', borderBottom: '1px solid rgba(201,164,80,0.12)',
        padding: '14px 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => navigate('/plannings')}
            style={{
              background: 'none', border: '1px solid rgba(201,164,80,0.2)',
              color: '#6A8A9A', cursor: 'pointer', padding: '6px 12px',
              borderRadius: '2px', fontSize: '12px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#C9A450'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6A8A9A'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.2)' }}
          >
            <IcoArrow /> Retour
          </button>

          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: '20px',
              fontWeight: 600, color: '#C9A450', margin: 0, lineHeight: 1,
            }}>
              Grille EDT
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#3D5766' }}>
              {edt?.annee_academique} · S{edt?.semestre} · {campus}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          style={{
            background: '#C9A450', border: 'none', color: '#07090E',
            cursor: 'pointer', padding: '8px 16px', borderRadius: '2px',
            fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <IcoPDF /> Exporter PDF
        </button>
      </div>

      {/* ── Sous-titre semaine ─────────────────────────────────────────────── */}
      <div style={{ padding: '10px 32px', background: 'rgba(10,15,22,0.5)', borderBottom: '1px solid rgba(201,164,80,0.06)' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#4D6A7A' }}>
          Semaine du <strong style={{ color: '#8AACBA' }}>{edt?.semaine_debut}</strong> au <strong style={{ color: '#8AACBA' }}>{edt?.semaine_fin}</strong>
          <span style={{ marginLeft: '16px', color: '#2A4555' }}>
            {creneaux.length} créneau{creneaux.length !== 1 ? 'x' : ''} · {classes.length} classe{classes.length !== 1 ? 's' : ''}
          </span>
        </p>
      </div>

      {/* ── Sommaire des classes (navigation rapide) ──────────────────────── */}
      {classes.length > 0 && (
        <div style={{
          padding: '12px 32px',
          background: 'rgba(10,15,22,0.35)',
          borderBottom: '1px solid rgba(201,164,80,0.06)',
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
        }}>
          <span style={{
            fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#3D5766', marginRight: '8px',
          }}>
            Aller à
          </span>
          {classes.map(cl => (
            <button
              key={cl.key}
              onClick={() => scrollToClasse(cl.key)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,164,80,0.18)',
                color: '#8AACBA',
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '2px',
                fontSize: '11px',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#C9A450'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8AACBA'; e.currentTarget.style.borderColor = 'rgba(201,164,80,0.18)' }}
            >
              {cl.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Grilles : une par classe ───────────────────────────────────────── */}
      <div style={{ padding: '24px' }}>
        {classes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            color: '#2A4555', fontSize: '14px',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '16px', opacity: 0.3 }}>📅</div>
            Aucun créneau dans cet emploi du temps.<br/>
            <span style={{ fontSize: '12px', color: '#1E3040' }}>
              Utilisez la génération automatique ou ajoutez des créneaux manuellement.
            </span>
          </div>
        ) : (
          classes.map((cl, idx) => (
            <GrilleClasse
              key={cl.key}
              classe={cl}
              dates={dates}
              isLast={idx === classes.length - 1}
              sectionRef={el => { sectionRefs.current[cl.key] = el }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Grille d'une seule classe ─────────────────────────────────────────────
function GrilleClasse({ classe, dates, isLast, sectionRef }) {
  // Indexer les créneaux de cette classe par jour/heure
  const grid = useMemo(() => {
    const g = {}
    JOURS.forEach(j => { g[j] = {} })
    classe.creneaux.forEach(c => {
      if (!g[c.jour][c.heure_debut]) g[c.jour][c.heure_debut] = []
      g[c.jour][c.heure_debut].push(c)
    })
    return g
  }, [classe.creneaux])

  return (
    <section
      ref={sectionRef}
      style={{
        marginBottom: isLast ? 0 : '40px',
        scrollMarginTop: '120px',
      }}
    >
      {/* Titre de la classe */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid rgba(201,164,80,0.25)',
        borderBottom: '1px solid rgba(201,164,80,0.12)',
        background: 'rgba(201,164,80,0.04)',
        marginBottom: '12px',
      }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '22px', fontWeight: 600,
          color: '#C9A450', margin: 0, letterSpacing: '0.02em',
        }}>
          {classe.label}
        </h2>
        <span style={{ fontSize: '11px', color: '#3D5766', letterSpacing: '0.1em' }}>
          {classe.creneaux.length} créneau{classe.creneaux.length !== 1 ? 'x' : ''}
        </span>
      </div>

      {/* Grille */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', minWidth: '900px', borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}>
          <colgroup>
            <col style={{ width: '95px' }} />
            {JOURS.map(j => <col key={j} />)}
          </colgroup>

          <thead>
            <tr>
              <th style={{
                background: 'rgba(10,15,22,0.9)',
                border: '1px solid rgba(201,164,80,0.1)',
                padding: '10px 8px', fontSize: '10px',
                color: '#3D5766', textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                Horaire
              </th>
              {JOURS.map(j => (
                <th key={j} style={{
                  background: 'rgba(201,164,80,0.06)',
                  border: '1px solid rgba(201,164,80,0.1)',
                  padding: '10px 8px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '15px', fontWeight: 600, color: '#C9A450',
                  }}>
                    {JOURS_LABELS[j]}
                  </div>
                  {dates[j] && (
                    <div style={{ fontSize: '10px', color: '#3D5766', marginTop: '2px' }}>
                      {dates[j]}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PLAGES.map((plage, pi) => (
              <tr key={plage.debut}>
                {/* Colonne horaire */}
                <td style={{
                  background: 'rgba(10,15,22,0.7)',
                  border: '1px solid rgba(201,164,80,0.08)',
                  padding: '10px 8px', textAlign: 'center',
                  verticalAlign: 'middle',
                }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '13px', fontWeight: 600, color: '#8AACBA',
                  }}>
                    {plage.debut}
                  </div>
                  <div style={{ fontSize: '9px', color: '#2A4555', margin: '1px 0' }}>à</div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '13px', fontWeight: 600, color: '#8AACBA',
                  }}>
                    {plage.fin}
                  </div>
                </td>

                {/* Cellules par jour */}
                {JOURS.map(jour => {
                  const entries = grid[jour][plage.debut] || []
                  const isEmpty = entries.length === 0
                  const isOdd = pi % 2 === 1
                  return (
                    <td key={jour} style={{
                      border: '1px solid rgba(201,164,80,0.07)',
                      padding: entries.length > 0 ? '6px' : '0',
                      verticalAlign: 'top',
                      background: isEmpty
                        ? (isOdd ? 'rgba(10,15,22,0.4)' : 'rgba(7,9,14,0.6)')
                        : 'transparent',
                      minHeight: '80px',
                    }}>
                      {isEmpty ? null : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {entries.map(c => <CoursCard key={c.id} c={c} />)}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Carte d'un cours (sobre, sans couleur de fond) ────────────────────────
function CoursCard({ c }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(201,164,80,0.18)',
      borderLeft: '2px solid rgba(201,164,80,0.55)',
      borderRadius: '2px',
      padding: '6px 8px',
      fontSize: '11px',
      lineHeight: 1.4,
    }}>
      {/* Code matière + intitulé */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '13px', fontWeight: 700, color: '#C9A450',
        }}>
          {c.matiere_code}
        </span>
      </div>

      <div style={{
        color: '#EDE8DC', fontWeight: 500, fontSize: '11px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: '4px',
      }}>
        {c.matiere_intitule}
      </div>

      {/* Enseignant + Salle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'rgba(220,210,190,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
          {c.enseignant_nom || '—'}
        </span>
        <span style={{
          fontSize: '9.5px', color: 'rgba(220,210,190,0.4)',
          flexShrink: 0, marginLeft: '4px',
        }}>
          Salle {c.salle_nom}
        </span>
      </div>
    </div>
  )
}

const IcoArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IcoPDF = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
)
