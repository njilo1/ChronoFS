export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3.5" style={{ width: `${85 - i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ height = 'h-32', className = '' }) {
  return <div className={`skeleton ${height} rounded-md ${className}`} />;
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}
