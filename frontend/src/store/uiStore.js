import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUiStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar:    () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebar:       (v) => set({ sidebarCollapsed: !!v }),
    }),
    { name: 'fschrono-ui' }
  )
);

export default useUiStore;
