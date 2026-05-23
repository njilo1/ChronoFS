import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.jpeg'

// ── Palette "Nuit d'Ebolowa" ──────────────────────────────
const GOLD   = '#C9A450'
const DEEP   = '#07090E'

export default function Login() {
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const { login, isAuthenticated } = useAuth()

  // Déjà connecté → aller directement au dashboard
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Identifiant ou mot de passe incorrect.'
          : 'Connexion impossible. Vérifiez que le serveur Django est démarré.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DEEP,
      // Grille + deux lumières colorées pour la profondeur
      backgroundImage: `
        linear-gradient(rgba(201,164,80,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,164,80,0.035) 1px, transparent 1px),
        radial-gradient(ellipse 90% 55% at 50% -5%, rgba(26,94,56,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 55% 45% at 88% 92%, rgba(201,164,80,0.09) 0%, transparent 50%)
      `,
      backgroundSize: '56px 56px, 56px 56px, 100% 100%, 100% 100%',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Orbes dorés flottants en arrière-plan ──────── */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* ── Carte principale ───────────────────────────── */}
      <div className="login-card" style={{
        width: '100%',
        maxWidth: '372px',
        backgroundColor: 'rgba(10, 15, 22, 0.97)',
        border: `1px solid rgba(201,164,80,0.18)`,
        borderRadius: '3px',
        boxShadow: `
          0 36px 90px rgba(0,0,0,0.75),
          0 0 0 1px rgba(201,164,80,0.06),
          inset 0 1px 0 rgba(201,164,80,0.13)
        `,
        overflow: 'hidden',
      }}>

        {/* Ligne d'accent dorée en haut de la carte */}
        <div style={{
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${GOLD} 40%, ${GOLD} 60%, transparent 100%)`,
        }} />

        {/* ── Contenu ──────────────────────────────────── */}
        <div style={{ padding: '44px 42px 40px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>

            {/* Logo de la faculté avec halo doré pulsant */}
            <div className="login-logo-wrap">
              <span className="login-logo-halo" aria-hidden="true" />
              <span className="login-logo-ring" aria-hidden="true" />
              <img src={logo} alt="Logo Faculté des Sciences — Université d'Ebolowa" className="login-logo" />
            </div>

            {/* Ornement : trois traits décroissants */}
            <div className="login-stagger-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
              {[44, 26, 12].map((w, i) => (
                <div key={i} style={{
                  height: '1px',
                  width: `${w}px`,
                  background: `rgba(201,164,80,${0.55 - i * 0.15})`,
                }} />
              ))}
            </div>

            <h1 className="login-title" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '46px',
              fontWeight: '600',
              color: GOLD,
              letterSpacing: '0.05em',
              lineHeight: '1',
              margin: '0 0 11px',
            }}>
              ChronoFS
            </h1>

            <p className="login-stagger-2" style={{
              fontSize: '9px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#3D5766',
              margin: 0,
            }}>
              Faculté des Sciences · Université d'Ebolowa
            </p>
          </div>

          {/* Séparateur */}
          <div className="login-stagger-3" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,164,80,0.09)' }} />
            <span style={{
              fontSize: '8.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'rgba(201,164,80,0.38)',
              whiteSpace: 'nowrap',
            }}>
              Accès administrateur
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,164,80,0.09)' }} />
          </div>

          {/* ── Formulaire ─────────────────────────────── */}
          <form onSubmit={handleSubmit} className="login-stagger-4">

            {/* Champ identifiant */}
            <div style={{ marginBottom: '18px' }}>
              <Label>Identifiant</Label>
              <input
                type="text"
                className="login-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Champ mot de passe */}
            <div style={{ marginBottom: '26px' }}>
              <Label>Mot de passe</Label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                {/* Bouton afficher/masquer le mot de passe */}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(201,164,80,0.38)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.07)',
                borderLeft: '2px solid rgba(220,53,69,0.55)',
                padding: '10px 14px',
                borderRadius: '2px',
                marginBottom: '22px',
                fontSize: '13px',
                color: '#D97070',
                lineHeight: '1.5',
              }}>
                {error}
              </div>
            )}

            {/* Bouton de connexion */}
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <span className="login-btn-content">
                  <IconSpinner />
                  Connexion…
                </span>
              ) : (
                <span className="login-btn-content">
                  <span>Se connecter</span>
                  <span className="login-btn-arrow" aria-hidden="true">
                    <IconArrow />
                  </span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Pied de page */}
      <p style={{
        marginTop: '22px',
        fontSize: '10.5px',
        color: '#1E2E38',
        letterSpacing: '0.09em',
      }}>
        Année académique 2025–2026
      </p>
    </div>
  )
}

/* ── Composants utilitaires locaux ───────────────────────── */

function Label({ children }) {
  return (
    <label style={{
      display: 'block',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'rgba(201,164,80,0.55)',
      marginBottom: '8px',
      fontWeight: '500',
    }}>
      {children}
    </label>
  )
}

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M1 5 H12" />
      <path d="M8 1 L12 5 L8 9" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
