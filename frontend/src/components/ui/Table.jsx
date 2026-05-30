import { motion } from 'framer-motion';
import { Pencil, Trash2, Inbox, Power, PowerOff } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

/**
 * Table — version minimaliste sans classes ni effets exotiques sur
 * les <tr>. Tout est en styles inline pour garantir un alignement
 * identique entre thead et tbody, indépendamment de toute interférence
 * avec la cascade CSS (cache PWA, ordre de chargement, etc.).
 */
function SkeletonRow({ cols, isDark }) {
  return (
    <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(31,42,64,0.7)' : 'rgba(229,226,216,0.7)'}` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'left' }}>
          <div className="skeleton h-3.5" style={{ width: `${45 + (i * 19) % 45}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function Table({
  columns, data, onEdit, onDelete, onToggle, toggleField = 'disponible', loading,
  emptyText = 'Aucune donnée.',
}) {
  const isDark   = useThemeStore((s) => s.theme === 'dark');
  const hasActions = onEdit || onDelete || onToggle;
  const totalCols  = columns.length + (hasActions ? 1 : 0);

  // Palette inline pour court-circuiter toute désync de .dark
  const c = {
    bg:         isDark ? '#111827' : '#FFFFFF',
    bgHead:     isDark ? '#0F1729' : '#F7F7F2',
    border:     isDark ? '#1F2A40' : '#E5E2D8',
    borderSoft: isDark ? 'rgba(31,42,64,0.6)' : 'rgba(229,226,216,0.6)',
    text:       isDark ? '#E5E5DE' : '#1F2937',
    textStrong: isDark ? '#F5F4EE' : '#0B1220',
    textMuted:  isDark ? '#A1A6B0' : '#5B6573',
    textSub:    isDark ? '#6F7787' : '#8E97A4',
    hover:      isDark ? '#1A2235' : 'rgba(251,247,236,0.6)',
  };

  const wrapperStyle = {
    overflowX: 'auto',
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    backgroundColor: c.bg,
    boxShadow: '0 1px 2px rgba(15,31,71,0.04)',
  };

  const tableStyle = {
    width: '100%',
    fontSize: 14,
    borderCollapse: 'collapse',
    tableLayout: 'auto',
  };

  const thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: c.textMuted,
    backgroundColor: c.bgHead,
    borderBottom: `1px solid ${c.border}`,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  const tdStyleBase = {
    padding: '14px 16px',
    textAlign: 'left',
    verticalAlign: 'middle',
    borderBottom: `1px solid ${c.borderSoft}`,
  };

  if (loading) {
    return (
      <div style={wrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={thStyle}>{col.label}</th>
              ))}
              {hasActions && <th style={{ ...thStyle, width: 96 }} />}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={totalCols} isDark={isDark} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          ...wrapperStyle,
          padding: '56px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          color: c.textMuted,
        }}
      >
        <div style={{
          padding: 14, borderRadius: 6,
          backgroundColor: isDark ? '#1A2235' : '#F3F4F1',
          border: `1px solid ${c.border}`,
        }}>
          <Inbox size={22} strokeWidth={1.5} style={{ color: c.textSub }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{emptyText}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={wrapperStyle}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={thStyle}>{col.label}</th>
            ))}
            {hasActions && (
              <th style={{ ...thStyle, textAlign: 'right', width: 96 }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={row.id ?? i}
              className="group"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.45), ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = c.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              style={{ transition: 'background-color 0.15s ease' }}
            >
              {columns.map((col, ci) => (
                <td
                  key={col.key}
                  style={{
                    ...tdStyleBase,
                    color: ci === 0 ? c.textStrong : c.text,
                    fontWeight: ci === 0 ? 600 : 400,
                    borderBottom: i === data.length - 1 ? 'none' : tdStyleBase.borderBottom,
                  }}
                >
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
              {hasActions && (
                <td
                  style={{
                    ...tdStyleBase,
                    textAlign: 'right',
                    borderBottom: i === data.length - 1 ? 'none' : tdStyleBase.borderBottom,
                  }}
                >
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {onToggle && (() => {
                      const actif = row[toggleField];
                      const ToggleIcon = actif ? PowerOff : Power;
                      const accent = actif ? '#B45309' : '#0F6B45';
                      return (
                        <button
                          onClick={() => onToggle(row)}
                          title={actif ? 'Désactiver' : 'Activer'}
                          style={{
                            padding: 6, borderRadius: 4, cursor: 'pointer',
                            color: c.textMuted, backgroundColor: 'transparent', border: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = accent;
                            e.currentTarget.style.backgroundColor = isDark ? '#1A2235' : '#F3F4F1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = c.textMuted;
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <ToggleIcon size={13} strokeWidth={1.6} />
                        </button>
                      );
                    })()}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        title="Modifier"
                        style={{
                          padding: 6, borderRadius: 4, cursor: 'pointer',
                          color: c.textMuted, backgroundColor: 'transparent', border: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDark ? '#C9A227' : '#1E3A8A';
                          e.currentTarget.style.backgroundColor = isDark ? '#1A2235' : '#F3F4F1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = c.textMuted;
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Pencil size={13} strokeWidth={1.6} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row.id)}
                        title="Supprimer"
                        style={{
                          padding: 6, borderRadius: 4, cursor: 'pointer',
                          color: c.textMuted, backgroundColor: 'transparent', border: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#B91C1C';
                          e.currentTarget.style.backgroundColor = 'rgba(185,28,28,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = c.textMuted;
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash2 size={13} strokeWidth={1.6} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
