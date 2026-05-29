import { create } from 'zustand';

/**
 * Confirmation promisifiée — remplace `window.confirm`.
 *
 * Usage :
 *   import { askConfirm } from '@/store/confirmStore';
 *   if (await askConfirm({ title: 'Supprimer ?', description: '…' })) { … }
 *
 * Un seul dialogue à la fois (suffisant : une confirmation est bloquante).
 */
let _resolve = null;

const DEFAULTS = {
  open: false,
  title: 'Confirmer',
  description: '',
  confirmLabel: 'Supprimer',
  variant: 'danger',
};

const useConfirmStore = create((set) => ({
  state: { ...DEFAULTS },

  ask: (opts = {}) =>
    new Promise((resolve) => {
      _resolve = resolve;
      set({ state: { ...DEFAULTS, ...opts, open: true } });
    }),

  resolve: (value) => {
    set((s) => ({ state: { ...s.state, open: false } }));
    if (_resolve) { _resolve(value); _resolve = null; }
  },
}));

export const askConfirm = (opts) => useConfirmStore.getState().ask(opts);
export default useConfirmStore;
