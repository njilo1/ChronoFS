import api from './api';

/**
 * Récupère TOUTES les pages d'un endpoint DRF paginé.
 *
 * L'API pagine à 20 résultats par page (cf. backend StandardPagination).
 * Sans parcourir les pages, toute liste de plus de 20 éléments est tronquée
 * silencieusement : compteurs faux, sélecteurs incomplets, planning partiel,
 * et erreurs « existe déjà » sur des doublons restés hors écran.
 *
 * `page_size=500` ramène l'essentiel en un seul appel ; la boucle couvre le
 * cas (rare) où il y aurait davantage d'enregistrements. Reste robuste si
 * l'endpoint n'est pas paginé (réponse déjà sous forme de tableau).
 *
 * @param {string} url      chemin de l'endpoint (ex. '/salles/')
 * @param {object} [params] filtres additionnels éventuels (?champ=valeur)
 * @returns {Promise<Array>} tableau plat de tous les résultats
 */
export async function fetchAll(url, params = {}) {
  let all = [];
  let page = 1;
  for (;;) {
    const res = await api.get(url, { params: { ...params, page, page_size: 500 } });
    if (Array.isArray(res.data)) return res.data;
    all = all.concat(res.data.results ?? []);
    if (!res.data.next) break;
    page += 1;
  }
  return all;
}
