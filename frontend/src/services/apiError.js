/**
 * Transforme une erreur axios/DRF en message clair, en français.
 *
 * DRF renvoie selon les cas :
 *   - { detail: "…" }                              (permissions, 404, actions custom)
 *   - { champ: ["message1", "message2"], … }       (validation de serializer)
 *   - { non_field_errors: ["…"] }                  (unique_together, validate())
 *   - une chaîne brute
 * Certains messages par défaut de DRF sont en anglais : on traduit les
 * plus fréquents pour ne jamais exposer d'anglais au chef/DAR.
 */

const TRADUCTIONS = [
  [/must make a unique set/i,            'Cet enregistrement existe déjà.'],
  [/doivent former un ensemble unique/i, 'Cet enregistrement existe déjà.'],
  [/already exists/i,                    'Cet enregistrement existe déjà.'],
  [/existe déjà/i,                       'Cet enregistrement existe déjà.'],
  [/this field is required/i,        'Ce champ est obligatoire.'],
  [/this field may not be blank/i,   'Ce champ ne peut pas être vide.'],
  [/this field may not be null/i,    'Ce champ est obligatoire.'],
  [/enter a valid/i,                 'Valeur invalide.'],
  [/is not a valid choice/i,         'Valeur non autorisée.'],
  [/a valid integer is required/i,   'Un nombre entier est attendu.'],
  [/no .* matches the given query/i, 'Élément introuvable.'],
];

function traduire(msg) {
  for (const [re, fr] of TRADUCTIONS) if (re.test(msg)) return fr;
  return msg;
}

export function extractApiError(err, fallback = 'Une erreur est survenue.') {
  // Pas de réponse serveur (réseau, CORS, timeout)
  if (!err?.response) {
    if (err?.message === 'Network Error') {
      return 'Serveur injoignable. Vérifiez votre connexion.';
    }
    return fallback;
  }

  const { status, data } = err.response;
  if (status === 401) return 'Session expirée. Veuillez vous reconnecter.';
  if (status === 403) return "Vous n'avez pas les droits pour cette action.";

  if (!data) return fallback;
  if (typeof data === 'string') return traduire(data);
  if (data.detail) return traduire(String(data.detail));

  // Agrège les erreurs de validation par champ (premier message de chaque).
  const parts = [];
  for (const val of Object.values(data)) {
    const msgs = Array.isArray(val) ? val : [val];
    for (const m of msgs) {
      if (m == null || typeof m === 'object') continue;
      parts.push(traduire(String(m)));
    }
  }
  return parts.length ? parts.join(' ') : fallback;
}
