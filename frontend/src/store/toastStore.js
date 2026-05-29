import { create } from 'zustand';

/**
 * File d'attente de notifications "toast".
 *
 * Volontairement HORS persist : un toast est éphémère, il ne doit jamais
 * survivre à un rechargement. On expose aussi un helper `toast` pour
 * pousser une notification depuis n'importe où (services, stores) sans
 * passer par un hook React.
 */
let _id = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  push: (type, message, opts = {}) => {
    const id = ++_id;
    // Les erreurs restent plus longtemps (l'utilisateur doit pouvoir lire).
    const duration = opts.duration ?? (type === 'error' ? 6000 : 4000);
    set((s) => ({
      toasts: [...s.toasts, { id, type, message, title: opts.title ?? null }],
    }));
    if (duration > 0) setTimeout(() => get().dismiss(id), duration);
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear:   () => set({ toasts: [] }),
}));

/** Helper impératif : toast.success('…'), toast.error('…'), etc. */
export const toast = {
  success: (m, o) => useToastStore.getState().push('success', m, o),
  error:   (m, o) => useToastStore.getState().push('error',   m, o),
  warning: (m, o) => useToastStore.getState().push('warning', m, o),
  info:    (m, o) => useToastStore.getState().push('info',    m, o),
};

export default useToastStore;
