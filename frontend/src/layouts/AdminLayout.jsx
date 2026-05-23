import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.jpeg'

export default function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#07090E', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: '230px', flexShrink: 0,
        backgroundColor: '#090D14',
        borderRight: '1px solid rgba(201,164,80,0.07)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        overflowY: 'auto', zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 18px 22px', borderBottom: '1px solid rgba(201,164,80,0.06)', textAlign: 'center' }}>

          {/* Logo de la faculté */}
          <div className="sidebar-logo-wrap">
            <span className="sidebar-logo-halo" aria-hidden="true" />
            <img src={logo} alt="Logo FS-UEB" className="sidebar-logo" />
          </div>

          {/* Ornement : trois traits décroissants */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '11px' }}>
            {[38, 22, 10].map((w, i) => (
              <div key={i} style={{ height: '1px', width: `${w}px`, background: `rgba(201,164,80,${0.5 - i * 0.12})` }} />
            ))}
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: '22px',
            fontWeight: 600, color: '#C9A450', letterSpacing: '0.04em',
            margin: '0 0 3px', lineHeight: 1,
          }}>ChronoFS</h2>
          <p style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#1E3040', margin: 0 }}>
            FS · UEB Admin
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '14px 10px' }}>
          <NavSection>Général</NavSection>
          <NavItem to="/dashboard"><IcoDash /><span>Tableau de bord</span></NavItem>

          <NavSection mt>Gestion</NavSection>
          <NavItem to="/campus"><IcoMap /><span>Campus</span></NavItem>
          <NavItem to="/salles"><IcoSalle /><span>Salles</span></NavItem>
          <NavItem to="/departements"><IcoDept /><span>Départements</span></NavItem>
          <NavItem to="/filieres"><IcoFolder /><span>Filières &amp; Niveaux</span></NavItem>
          <NavItem to="/enseignants"><IcoUser /><span>Enseignants</span></NavItem>
          <NavItem to="/matieres"><IcoBook /><span>Matières</span></NavItem>

          <NavSection mt>Planning</NavSection>
          <NavItem to="/sessions"><IcoClock /><span>Sessions</span></NavItem>
          <NavItem to="/plannings"><IcoCalendar /><span>Emplois du temps</span></NavItem>

          <NavSection mt>Outils</NavSection>
          <NavItem to="/import"><IcoImport /><span>Import Excel</span></NavItem>
        </nav>

        {/* Déconnexion */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(201,164,80,0.06)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', background: 'none', border: 'none',
              padding: '9px 12px', cursor: 'pointer', borderRadius: '2px',
              color: 'rgba(220,53,69,0.45)', fontFamily: "'DM Sans', sans-serif",
              fontSize: '13.5px', transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#DC3545'; e.currentTarget.style.background = 'rgba(220,53,69,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(220,53,69,0.45)'; e.currentTarget.style.background = 'none' }}
          >
            <IcoLogout /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ────────────────────────────── */}
      <main style={{ marginLeft: '230px', flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}

/* ── Sous-composants ─────────────────────────────────────── */

function NavSection({ children, mt }) {
  return (
    <p style={{
      fontSize: '8.5px', letterSpacing: '0.22em', textTransform: 'uppercase',
      color: '#182A38', padding: '0 10px', margin: mt ? '20px 0 6px' : '0 0 6px',
    }}>
      {children}
    </p>
  )
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 'admin-nav-item' + (isActive ? ' active' : '')}
    >
      {children}
    </NavLink>
  )
}

/* ── Icônes SVG ──────────────────────────────────────────── */
const S = ({ children }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const IcoDash      = () => <S><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></S>
const IcoMap       = () => <S><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></S>
const IcoSalle     = () => <S><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></S>
const IcoDept      = () => <S><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></S>
const IcoFolder    = () => <S><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></S>
const IcoUser      = () => <S><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></S>
const IcoBook      = () => <S><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></S>
const IcoCalendar  = () => <S><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></S>
const IcoClock     = () => <S><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></S>
const IcoLogout    = () => <S><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></S>
const IcoImport    = () => <S><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></S>
