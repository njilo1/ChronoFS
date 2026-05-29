import api from './api';
import useAuthStore from '../store/authStore';

export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password });
  const u = data.user ?? {};
  useAuthStore.getState().setAuth(
    { username, nom: u.last_name || u.first_name || username },
    data.access,
    data.refresh,
    u.role
  );
  return data;
}

export function logout() {
  useAuthStore.getState().logout();
}
