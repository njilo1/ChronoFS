import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { extractApiError } from '../services/apiError';

/**
 * Hook CRUD générique.
 *
 * Options (toutes facultatives) :
 *   nom    : libellé de l'entité au singulier (ex. "Enseignant", "Filière").
 *            Active les toasts de succès automatiques.
 *   genre  : 'm' | 'f' — accord du participe ("ajouté" / "ajoutée").
 *
 * Les méthodes create/update/patch/remove :
 *   - affichent un toast de succès si `nom` est fourni ;
 *   - affichent un toast d'erreur (message backend traduit) en cas d'échec ;
 *   - RE-LÈVENT l'erreur pour que l'appelant puisse réagir (garder la modale
 *     ouverte, par ex.).
 */
export function useCrud(endpoint, options = {}) {
  const { nom, genre = 'm' } = options;
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const accord = genre === 'f' ? 'e' : '';
  const msg = {
    create: nom ? `${nom} ajouté${accord} avec succès.`   : null,
    update: nom ? `${nom} modifié${accord} avec succès.`  : null,
    remove: nom ? `${nom} supprimé${accord} avec succès.` : null,
  };

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // L'API DRF pagine à 20 par défaut : on parcourt TOUTES les pages pour
      // alimenter la liste complète. Sans cela, au-delà de 20 éléments les
      // suivants restaient invisibles alors qu'ils existent en base — ce qui
      // produisait des erreurs « existe déjà » sur des doublons hors écran
      // (cas TIC L3, salles…). page_size=500 suffit en un appel ; la boucle
      // couvre le cas (rare) où il y aurait davantage d'enregistrements.
      let all = [];
      let page = 1;
      for (;;) {
        const res = await api.get(`/${endpoint}/`, { params: { page, page_size: 500 } });
        if (Array.isArray(res.data)) { all = res.data; break; }
        all = all.concat(res.data.results ?? []);
        if (!res.data.next) break;
        page += 1;
      }
      setData(all);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { refetch(); }, [refetch]);

  // Exécute une mutation : toast succès/erreur + refetch, puis re-throw.
  const run = async (fn, successMessage) => {
    try {
      const res = await fn();
      await refetch();
      if (successMessage) toast.success(successMessage);
      return res;
    } catch (e) {
      toast.error(extractApiError(e));
      throw e;
    }
  };

  const create = (payload)     => run(() => api.post(`/${endpoint}/`, payload),        msg.create);
  const update = (id, payload) => run(() => api.put(`/${endpoint}/${id}/`, payload),   msg.update);
  const patch  = (id, payload) => run(() => api.patch(`/${endpoint}/${id}/`, payload), msg.update);
  const remove = (id)          => run(() => api.delete(`/${endpoint}/${id}/`),         msg.remove);

  return { data, loading, error, refetch, create, update, patch, remove };
}
