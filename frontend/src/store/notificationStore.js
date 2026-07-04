import { create } from 'zustand';
import { toast } from './toastStore';
import {
  fetchNotifications, fetchUnreadCount,
  markRead as apiMarkRead, markAllRead as apiMarkAllRead,
} from '../services/notifications';

/* ─────────────────────────────────────────────────────────────────────────
   Store de notifications — centralise compteur + liste pour :

   1. PERFORMANCE — cache + prefetch + stale-while-revalidate : l'ouverture du
      panneau affiche instantanément le cache, puis revalide en arrière-plan.
      Les requêtes concurrentes sont dédupliquées (une seule en vol à la fois).

   2. ROBUSTESSE — garde anti-écrasement (`lastMutation`) : une réponse de
      liste/compteur partie AVANT une action locale (marquer lu) ne peut plus
      écraser l'état optimiste. C'est ce qui corrigeait le « double-clic » et
      le compteur qui remontait à 9 en production lente.
   ───────────────────────────────────────────────────────────────────────── */

// Requêtes en vol partagées (déduplication) — hors du state pour ne pas
// déclencher de re-render.
let listInFlight  = null;
let countInFlight = null;
// Compteur précédent connu (pour le toast « nouvelle notification »).
let prevCount = null;

// Fenêtre (ms) pendant laquelle on protège l'état optimiste d'un refetch
// serveur encore périmé (latence prod entre l'écriture et sa visibilité).
const GUARD_MS = 6000;

const useNotificationStore = create((set, get) => ({
  items:        [],
  count:        0,
  loading:      false,
  loaded:       false,   // au moins une liste chargée → cache chaud
  lastMutation: 0,       // timestamp de la dernière action locale (lu / tout-lu)

  /* Compteur de non-lues (léger). Garde anti-régression : si une action locale
     récente a fait baisser le compteur mais que le serveur renvoie encore une
     valeur plus haute (pas encore committé), on conserve la valeur optimiste. */
  refreshCount: async () => {
    try {
      if (!countInFlight) countInFlight = fetchUnreadCount();
      const n = await countInFlight;
      countInFlight = null;

      const { lastMutation, count } = get();
      if (Date.now() - lastMutation < GUARD_MS && n > count) {
        return count; // anti-flicker : ne pas faire remonter le badge
      }

      if (prevCount != null && n > prevCount) {
        const diff = n - prevCount;
        toast.info(diff > 1 ? `${diff} nouvelles notifications` : 'Nouvelle notification');
      }
      prevCount = n;
      set({ count: n });
      return n;
    } catch {
      countInFlight = null;
      return get().count;
    }
  },

  /* Liste des notifications. Stale-while-revalidate : si le cache est chaud on
     ne montre pas le spinner (revalidation silencieuse). La réponse est
     ignorée si une action locale est survenue après le départ de la requête. */
  loadList: async ({ force = false } = {}) => {
    const warm = get().loaded;
    if (!warm || force) set({ loading: true });

    const startedAt = Date.now();
    try {
      if (!listInFlight) listInFlight = fetchNotifications();
      const items = await listInFlight;
      listInFlight = null;

      // Une mutation plus récente que cette requête a la priorité.
      if (get().lastMutation > startedAt) {
        set({ loading: false, loaded: true });
        return get().items;
      }
      set({ items, loading: false, loaded: true });
      return items;
    } catch {
      listInFlight = null;
      set({ loading: false });
      return get().items;
    }
  },

  /* Prefetch : amorce le cache (compteur + liste) avant même l'ouverture du
     panneau → affichage instantané au clic. Idempotent. */
  prefetch: () => {
    get().refreshCount();
    if (!get().loaded && !listInFlight) get().loadList();
  },

  /* Marque UNE notification comme lue — optimiste immédiat puis appel serveur.
     Le compteur n'est PAS re-synchronisé tout de suite (la valeur optimiste est
     fiable) ; le polling/focus corrigera toute dérive sans flicker. */
  markRead: async (id) => {
    const wasUnread = get().items.some((n) => n.id === id && !n.lu);
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, lu: true } : n)),
      count: wasUnread ? Math.max(0, s.count - 1) : s.count,
      lastMutation: Date.now(),
    }));
    if (wasUnread) prevCount = Math.max(0, (prevCount ?? 1) - 1);
    try { await apiMarkRead(id); } catch { /* réessai au prochain poll */ }
  },

  /* Marque TOUT comme lu — optimiste immédiat puis appel serveur. */
  markAllRead: async () => {
    set((s) => ({
      items: s.items.map((n) => ({ ...n, lu: true })),
      count: 0,
      lastMutation: Date.now(),
    }));
    prevCount = 0;
    try { await apiMarkAllRead(); } catch { /* réessai au prochain poll */ }
  },
}));

export default useNotificationStore;
