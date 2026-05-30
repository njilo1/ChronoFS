import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user:    null,
      token:   null,
      refresh: null,
      role:    null,

      setAuth: (user, token, refresh, role) =>
        set({ user, token, refresh, role }),

      setTokens: (token, refresh) =>
        set({ token, refresh }),

      setUser: (user) =>
        set({ user }),

      logout: () =>
        set({ user: null, token: null, refresh: null, role: null }),
    }),
    { name: 'fschrono-auth' }
  )
);

export default useAuthStore;
