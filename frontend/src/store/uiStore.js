import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUiStore = create(
  persist(
    (set, get) => ({
      // — État desktop : sidebar repliée (icônes seules) ou déployée —
      sidebarCollapsed: false,
      toggleSidebar:    () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebar:       (v) => set({ sidebarCollapsed: !!v }),

      // — État mobile : tiroir de navigation (overlay) ouvert ou fermé —
      // Volontairement NON persisté : il doit toujours démarrer fermé.
      mobileNavOpen:    false,
      openMobileNav:    () => set({ mobileNavOpen: true }),
      closeMobileNav:   () => set({ mobileNavOpen: false }),
      toggleMobileNav:  () => set({ mobileNavOpen: !get().mobileNavOpen }),
    }),
    {
      name: 'fschrono-ui',
      // On ne persiste QUE la préférence desktop, pas l'état du tiroir mobile.
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

export default useUiStore;
