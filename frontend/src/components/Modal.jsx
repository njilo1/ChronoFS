export default function Modal({ title, onClose, onSubmit, saving, error, children, wide = false }) {
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card" style={{ maxWidth: wide ? '620px' : '500px' }}>

        {/* Top accent line */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #C9A450, transparent)' }} />

        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid rgba(201,164,80,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '22px', fontWeight: 600, color: '#C9A450', margin: 0,
          }}>
            {title}
          </h3>
          <button
            type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3D5766', padding: '4px', display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EDE8DC'}
            onMouseLeave={e => e.currentTarget.style.color = '#3D5766'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body + Footer */}
        <form onSubmit={onSubmit}>
          <div style={{ padding: '24px 28px' }}>
            {children}
            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.07)', borderLeft: '2px solid rgba(220,53,69,0.5)',
                padding: '10px 14px', borderRadius: '2px', marginTop: '16px',
                fontSize: '13px', color: '#D97070', lineHeight: '1.5',
              }}>
                {error}
              </div>
            )}
          </div>
          <div style={{
            padding: '14px 28px', borderTop: '1px solid rgba(201,164,80,0.08)',
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
          }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
