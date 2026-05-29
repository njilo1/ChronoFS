import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDom(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else                  root.classList.remove('dark');
  root.style.colorScheme = theme;
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      setTheme: (theme) => { applyDom(theme); set({ theme }); },
      toggle:   ()      => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyDom(next);
        set({ theme: next });
      },
    }),
    {
      name: 'fschrono-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyDom(state.theme);
      },
    }
  )
);

// Synchronise le DOM dès le chargement du module (avant React mount).
if (typeof window !== 'undefined') {
  applyDom(useThemeStore.getState().theme);
}

export default useThemeStore;
