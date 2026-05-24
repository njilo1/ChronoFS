import api from './api';
import useAuthStore from '../store/authStore';

export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password });
  useAuthStore.getState().setAuth(
    { username, nom: data.nom || username },
    data.access,
    data.refresh,
    data.role
  );
  return data;
}

export function logout() {
  useAuthStore.getState().logout();
}
