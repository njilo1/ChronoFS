import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const TYPE_LABELS  = { cours: 'Cours', examen: 'Examen', rattrapage: 'Rattrapage' }
const TYPE_COLORS  = { cours: '#C9A450', examen: '#50A0DC', rattrapage: '#80C980' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [recents, setRecents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      try {
        const [campus, salles, depts, filieres, enseignants, matieres, edts, creneaux] = await Promise.all([
          api.get('/campus/?page_size=1'),
          api.get('/salles/?page_size=1'),
          api.get('/departements/?page_size=1'),
          api.get('/filieres/?page_size=1'),
          api.get('/enseignants/?page_size=1'),
          api.get('/matieres/?page_size=1'),
          api.get('/emplois-du-temps/?page_size=6&ordering=-cree_le'),
          api.get('/creneaux/?page_size=1'),
        ])
        setStats({
          campus:      campus.data.count     ?? 0,
          salles:      salles.data.count     ?? 0,
          departements: depts.data.count     ?? 0,
          filieres:    filieres.data.count   ?? 0,
          enseignants: enseignants.data.count ?? 0,
          matieres:    matieres.data.count   ?? 0,
          edts:        edts.data.count       ?? 0,
          creneaux:    creneaux.data.count   ?? 0,
        })
        setRecents(edts.data.results ?? [])
      } finally { setLoading(false) }
    }
    loadAll()
  }, [])

  const CARDS = [
    { label: 'Campus',       key: 'campus',       accent: '#C9A450', icon: <IcoMap />,      to: '/campus'      },
    { label: 'Salles',       key: 'salles',       accent: '#5B8FA8', icon: <IcoSalle />,    to: '/salles'      },
    { label: 'Départements', key: 'departements', accent: '#7A9A6A', icon: <IcoDept />,     to: '/departements' },
    { label: 'Filières',     key: 'filieres',     accent: '#A884C9', icon: <IcoFolder />,   to: '/filieres'    },
    { label: 'Enseignants',  key: 'enseignants',  accent: '#C98450', icon: <IcoUser />,     to: '/enseignants' },
    { label: 'Matières',     key: 'matieres',     accent: '#5A9AAA', icon: <IcoBook />,     to: '/matieres'    },
    { label: 'EDT créés',    key: 'edts',         accent: '#C96464', icon: <IcoCalendar />, to: '/plannings'   },
    { label: 'Créneaux',     key: 'creneaux',     accent: '#6AACBA', icon: <IcoClock />,    to: '/plannings'   },
  ]

  return (
    <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", color: '#EDE8DC' }}>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="dash-header" style={{ marginBottom: '36px' }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '38px', fontWeight: 600, color: '#C9A450', margin: '0 0 6px',
        }}>
          Tableau de bord
        </h1>
        <p style={{ color: '#3D5766', fontSize: '13px', margin: 0 }}>
          Faculté des Sciences - UEB
        </p>
      </div>

      {/* ── Cartes statistiques ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '28px',
      }}>
        {CARDS.map((c, i) => (
          <StatCard
            key={c.key}
            card={c}
            value={stats?.[c.key] ?? 0}
            loading={loading}
            index={i}
            navigate={navigate}
          />
        ))}
      </div>

      {/* ── Section inférieure : tableau pleine largeur ──────────────────── */}
      <div className="dash-bottom">
        <div style={{
          background: 'rgba(10,15,22,0.8)',
          border: '1px solid rgba(201,164,80,0.08)',
          borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 22px', borderBottom: '1px solid rgba(201,164,80,0.07)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '19px', color: '#C9A450', margin: 0 }}>
              Derniers emplois du temps
            </h3>
            <button
              onClick={() => navigate('/plannings')}
              style={{
                background: 'none', border: '1px solid rgba(201,164,80,0.18)',
                color: '#4D6A7A', cursor: 'pointer', padding: '4px 12px',
                borderRadius: '2px', fontSize: '11px', fontFamily: 'inherit',
              }}
            >
              Voir tout →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#3D5766', fontSize: '13px' }}>Chargement…</div>
          ) : recents.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#2A4555', fontSize: '13px' }}>
              Aucun emploi du temps créé.<br/>
              <span style={{ fontSize: '11px', color: '#1E3040' }}>Commencez par créer une semaine dans Emplois du temps.</span>
            </div>
          ) : (
            <table className="admin-table page-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Année · Semestre</th>
                  <th>Semaine</th>
                  <th>Campus</th>
                  <th>Créneaux</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recents.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => e.type_planning === 'cours' ? navigate('/plannings') : navigate('/examens')}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                        borderRadius: '2px', letterSpacing: '0.08em',
                        background: `${TYPE_COLORS[e.type_planning]}18`,
                        color: TYPE_COLORS[e.type_planning],
                        border: `1px solid ${TYPE_COLORS[e.type_planning]}35`,
                      }}>
                        {TYPE_LABELS[e.type_planning]}
                      </span>
                    </td>
                    <td style={{ color: '#EDE8DC', fontWeight: 500 }}>
                      {e.annee_academique} · S{e.semestre}
                    </td>
                    <td style={{ fontSize: '12px', color: '#4D6A7A' }}>
                      {e.semaine_debut}<span style={{ color: '#2A4555' }}> → </span>{e.semaine_fin}
                    </td>
                    <td style={{ fontSize: '12px', color: '#4D8A9A' }}>
                      {e.campus_nom
                        ? <>{e.campus_nom}<span style={{ color: '#3D5766', display: 'block', fontSize: '10px' }}>{e.campus_ville}</span></>
                        : <span style={{ color: '#2A4555' }}>—</span>
                      }
                    </td>
                    <td>
                      <span className="badge badge-gray">
                        {e.nb_creneaux + e.nb_creneaux_examen}
                      </span>
                    </td>
                    <td>
                      <span className={e.est_publie ? 'badge badge-green' : 'badge badge-gray'}>
                        {e.est_publie ? '✓ Publié' : 'Brouillon'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Hook compteur animé ─────────────────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) { setValue(0); return }
    let current = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

/* ── Carte statistique avec stagger + countUp ────────────────────────────── */
function StatCard({ card, value, loading, index, navigate }) {
  const displayed = useCountUp(loading ? 0 : value)
  return (
    <div
      className="dash-stat-card"
      style={{ animationDelay: `${0.2 + index * 0.08}s`, borderLeft: `3px solid ${card.accent}60` }}
      onClick={() => navigate(card.to)}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(16,22,32,0.9)'
        e.currentTarget.style.borderLeftColor = card.accent
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.35), inset 0 0 20px ${card.accent}06`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(10,15,22,0.85)'
        e.currentTarget.style.borderLeftColor = `${card.accent}60`
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ color: card.accent, opacity: 0.65, flexShrink: 0, transition: 'opacity 0.2s' }}>
        {card.icon}
      </div>
      <div>
        <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3D5766', margin: '0 0 4px' }}>
          {card.label}
        </p>
        {loading ? (
          <div className="skeleton" style={{ height: '26px', width: '44px', borderRadius: '2px' }} />
        ) : (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: '#EDE8DC', margin: 0, lineHeight: 1,
          }}>
            {displayed}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Icônes ──────────────────────────────────────────────────────────────── */
const S = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const IcoMap      = () => <S><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></S>
const IcoSalle    = () => <S><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></S>
const IcoDept     = () => <S><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></S>
const IcoFolder   = () => <S><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></S>
const IcoUser     = () => <S><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></S>
const IcoBook     = () => <S><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></S>
const IcoCalendar = () => <S><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></S>
const IcoClock    = () => <S><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></S>
