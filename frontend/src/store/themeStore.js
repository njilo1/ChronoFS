import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      // Mode clair par défaut au premier lancement. L'utilisateur peut ensuite
      // activer le mode sombre via le bouton ; son choix est alors mémorisé.
      theme: 'light',
      setTheme: (theme) => { applyDom(theme); set({ theme }); },
      toggle:   ()      => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyDom(next);
        set({ theme: next });
      },
    }),
    {
      name: 'fschrono-theme',
      version: 2,
      // Les versions précédentes pouvaient mémoriser un thème sombre (déduit des
      // préférences système, ou choisi lors d'un test), ce qui rouvrait l'app en
      // sombre. On repart du mode clair une seule fois (pour tout état antérieur
      // v0/v1) ; les bascules ultérieures de l'utilisateur restent mémorisées.
      migrate: () => ({ theme: 'light' }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyDom(state.theme);
      },
    }
  )
);

// Synchronise le DOM dès le chargement du module (avant le montage React).
if (typeof window !== 'undefined') {
  applyDom(useThemeStore.getState().theme);
}

export default useThemeStore;
