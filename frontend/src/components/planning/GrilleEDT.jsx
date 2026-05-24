// Grille officielle UEB : 6 jours × (4 créneaux + 3 pauses intercalées)
const ROWS = [
  { type: 'cours', index: 0, horaire: '7h30 – 10h00' },
  { type: 'pause',            horaire: '10h00 – 10h15' },
  { type: 'cours', index: 1, horaire: '10h15 – 12h45' },
  { type: 'pause',            horaire: '12h45 – 13h00' },
  { type: 'cours', index: 2, horaire: '13h00 – 15h30' },
  { type: 'pause',            horaire: '15h30 – 15h45' },
  { type: 'cours', index: 3, horaire: '15h45 – 18h15' },
];

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function GrilleEDT({ seances = [] }) {
  // Index rapide : "creneau-jour" → séance
  const idx = {};
  seances.forEach((s) => { idx[`${s.creneau}-${s.jour}`] = s; });

  return (
    <div className="overflow-x-auto rounded-lg border border-eborder">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-esb">
            <th className="border border-eborder px-3 py-2.5 text-emuted font-medium text-center w-24">
              Horaires
            </th>
            {JOURS.map((j) => (
              <th key={j} className="border border-eborder px-3 py-2.5 text-etext font-semibold text-center">
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => {
            if (row.type === 'pause') {
              return (
                <tr key={ri} style={{ backgroundColor: '#F3F4F608' }}>
                  <td className="border border-eborder/40 px-3 py-1 text-center text-emuted/50 italic text-[10px]">
                    {row.horaire}
                  </td>
                  {JOURS.map((_, ji) => (
                    <td key={ji} className="border border-eborder/40" style={{ backgroundColor: '#F3F4F608' }} />
                  ))}
                </tr>
              );
            }

            return (
              <tr key={ri}>
                <td className="border border-eborder px-3 py-3 text-center font-medium text-emuted bg-esb/40 align-middle text-[11px] whitespace-nowrap">
                  {row.horaire}
                </td>
                {[0, 1, 2, 3, 4, 5].map((jourIdx) => {
                  const s = idx[`${row.index}-${jourIdx}`];
                  return (
                    <td key={jourIdx} className="border border-eborder px-2 py-2 align-top">
                      {s && (
                        <div className="space-y-0.5 min-h-[60px]">
                          <div className="font-semibold text-etext leading-tight">
                            {s.filiere?.nom} {s.filiere?.niveau}
                          </div>
                          <div className="text-gold font-medium">{s.ue?.code}</div>
                          <div className="text-emuted leading-tight line-clamp-2">{s.ue?.intitule}</div>
                          <div className="text-emuted/70 italic text-[10px]">
                            {s.enseignant
                              ? `${s.enseignant.grade ? s.enseignant.grade + ' ' : ''}${s.enseignant.nom}`
                              : '—'}
                          </div>
                          {s.salle && (
                            <div className="text-[10px] text-gold/60">Salle {s.salle.nom}</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
