import { Pencil, Trash2 } from 'lucide-react';

export default function Table({
  columns, data, onEdit, onDelete, loading,
  emptyText = 'Aucune donnée.',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-emuted text-sm">
        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        Chargement…
      </div>
    );
  }

  if (!data?.length) {
    return <div className="text-center py-16 text-emuted text-sm">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-eborder">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-esb/60 border-b border-eborder">
            {columns.map((c) => (
              <th key={c.key} className="text-left px-4 py-3 text-emuted font-medium text-xs uppercase tracking-wider">
                {c.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-emuted font-medium text-xs uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-eborder/40 hover:bg-white/[0.02] transition-colors last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-etext">
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 text-emuted hover:text-gold hover:bg-gold/10 rounded transition-all"
                        title="Modifier"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row.id)}
                        className="p-1.5 text-emuted hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
