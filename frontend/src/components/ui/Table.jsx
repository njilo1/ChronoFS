import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Inbox, Power, PowerOff, ChevronLeft, ChevronRight } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

/* Génère la liste des numéros de page à afficher, avec des ellipses ('…')
   quand il y a beaucoup de pages. `current` est 0-indexé, on renvoie du
   1-indexé. Ex. (page 5 sur 12) → [1, '…', 5, 6, 7, '…', 12]. */
function pageRange(current, count) {
  const c = current + 1;
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = [1];
  if (c > 4) pages.push('…');
  const from = Math.max(2, c - 1);
  const to   = Math.min(count - 1, c + 1);
  for (let i = from; i <= to; i++) pages.push(i);
  if (c < count - 3) pages.push('…');
  pages.push(count);
  return pages;
}

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
  emptyText = 'Aucune donnée.', pageSize = 50,
}) {
  const isDark   = useThemeStore((s) => s.theme === 'dark');
  const hasActions = onEdit || onDelete || onToggle;
  const totalCols  = columns.length + (hasActions ? 1 : 0);

  // — Pagination — Au-delà de `pageSize` lignes, on découpe en pages et on
  // affiche une barre de navigation (Précédent / numéros / Suivant). En deçà,
  // rien ne change. Une seule mise en œuvre ici couvre TOUTES les listes
  // (référentiel : campus, salles, filières, départements, UE, enseignants…).
  const total     = data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = useState(0);

  // Reste dans les bornes si la liste rétrécit (filtre de recherche,
  // suppression d'une ligne, changement d'onglet…).
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  const showPagination = total > pageSize;
  const safePage  = Math.min(page, pageCount - 1);
  const start     = safePage * pageSize;
  const pageData  = showPagination ? data.slice(start, start + pageSize) : (data ?? []);
  const rangeFrom = total === 0 ? 0 : start + 1;
  const rangeTo   = Math.min(start + pageSize, total);

  // Palette inline pour court-circuiter toute désync de .dark
  const c = {
    bg:         isDark ? '#111827' : '#FFFFFF',
    bgHead:     isDark ? '#0F1729' : '#EEF3FC',
    border:     isDark ? '#1F2A40' : '#E6ECF7',
    borderSoft: isDark ? 'rgba(31,42,64,0.6)' : 'rgba(229,226,216,0.6)',
    text:       isDark ? '#E5E5DE' : '#1C2333',
    textStrong: isDark ? '#F5F4EE' : '#1C2333',
    textMuted:  isDark ? '#A1A6B0' : '#667085',
    textSub:    isDark ? '#6F7787' : '#667085',
    hover:      isDark ? '#1A2235' : 'rgba(251,247,236,0.6)',
  };

  const wrapperStyle = {
    overflow: 'hidden',            // clippe proprement le radius (table + barre)
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    backgroundColor: c.bg,
    boxShadow: '0 1px 2px rgba(20,56,148,0.04)',
  };
  // Le défilement horizontal reste confiné à la table (pas à la barre de pagination).
  const scrollStyle = { overflowX: 'auto' };

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
        <div style={scrollStyle}>
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
          backgroundColor: isDark ? '#1A2235' : '#F4F6FC',
          border: `1px solid ${c.border}`,
        }}>
          <Inbox size={22} strokeWidth={1.5} style={{ color: c.textSub }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{emptyText}</p>
      </motion.div>
    );
  }

  // Styles des boutons de pagination — inline, comme le reste du composant,
  // pour rester cohérent en clair/sombre indépendamment de la classe .dark.
  const navBtn = (disabled) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 34, minWidth: 34, padding: '0 6px', borderRadius: 6,
    border: `1px solid ${c.border}`, backgroundColor: c.bg,
    color: disabled ? c.textSub : c.text,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background-color 0.15s ease, color 0.15s ease',
  });
  const numBtn = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 34, minWidth: 34, padding: '0 8px', borderRadius: 6,
    border: `1px solid ${active ? (isDark ? '#2F4EB8' : '#143894') : 'transparent'}`,
    backgroundColor: active ? (isDark ? '#2F4EB8' : '#143894') : 'transparent',
    color: active ? '#FFFFFF' : c.textMuted,
    fontSize: 13, fontWeight: active ? 700 : 500, fontVariantNumeric: 'tabular-nums',
    cursor: active ? 'default' : 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={wrapperStyle}
    >
      <div style={scrollStyle}>
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
          {pageData.map((row, i) => (
            <motion.tr
              key={row.id ?? i}
              className="group table-row"
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
                    borderBottom: i === pageData.length - 1 ? 'none' : tdStyleBase.borderBottom,
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
                    borderBottom: i === pageData.length - 1 ? 'none' : tdStyleBase.borderBottom,
                  }}
                >
                  <div className="row-actions flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
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
                            e.currentTarget.style.backgroundColor = isDark ? '#1A2235' : '#F4F6FC';
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
                          e.currentTarget.style.color = isDark ? '#C8A15A' : '#143894';
                          e.currentTarget.style.backgroundColor = isDark ? '#1A2235' : '#F4F6FC';
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
      </div>

      {showPagination && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, padding: '10px 16px',
          borderTop: `1px solid ${c.border}`, backgroundColor: c.bgHead,
        }}>
          <span style={{ fontSize: 12, color: c.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {rangeFrom}–{rangeTo} sur {total}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Page précédente"
              style={navBtn(safePage === 0)}
              onMouseEnter={(e) => { if (safePage !== 0) { e.currentTarget.style.backgroundColor = c.hover; e.currentTarget.style.color = c.textStrong; } }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.bg; e.currentTarget.style.color = safePage === 0 ? c.textSub : c.text; }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>

            {pageRange(safePage, pageCount).map((it, idx) =>
              it === '…' ? (
                <span key={`gap-${idx}`} style={{ minWidth: 28, textAlign: 'center', color: c.textSub, fontSize: 13 }}>…</span>
              ) : (
                <button
                  key={it}
                  type="button"
                  onClick={() => setPage(it - 1)}
                  aria-label={`Page ${it}`}
                  aria-current={it - 1 === safePage ? 'page' : undefined}
                  style={numBtn(it - 1 === safePage)}
                  onMouseEnter={(e) => { if (it - 1 !== safePage) e.currentTarget.style.backgroundColor = c.hover; }}
                  onMouseLeave={(e) => { if (it - 1 !== safePage) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {it}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage === pageCount - 1}
              aria-label="Page suivante"
              style={navBtn(safePage === pageCount - 1)}
              onMouseEnter={(e) => { if (safePage !== pageCount - 1) { e.currentTarget.style.backgroundColor = c.hover; e.currentTarget.style.color = c.textStrong; } }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.bg; e.currentTarget.style.color = safePage === pageCount - 1 ? c.textSub : c.text; }}
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
