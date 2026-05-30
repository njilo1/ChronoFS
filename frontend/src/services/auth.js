import api from './api';
import useAuthStore from '../store/authStore';

// Normalise l'objet user du backend pour le store : on conserve tous les
// champs (utiles à la modale Profil) et on dérive `nom` pour le header.
function toStoredUser(u, fallbackUsername) {
  const username = u.username ?? fallbackUsername;
  return {
    ...u,
    username,
    nom: u.last_name || u.first_name || username,
  };
}

export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password });
  const u = data.user ?? {};
  useAuthStore.getState().setAuth(
    toStoredUser(u, username),
    data.access,
    data.refresh,
    u.role
  );
  return data;
}

export function logout() {
  useAuthStore.getState().logout();
}

// Recharge le profil complet de l'utilisateur connecté et met à jour le store.
export async function fetchMe() {
  const { data } = await api.get('/auth/me/');
  useAuthStore.getState().setUser(toStoredUser(data, data.username));
  return data;
}

// Met à jour les informations du profil (PATCH partiel) puis rafraîchit le store.
export async function updateProfile(payload) {
  const { data } = await api.patch('/auth/me/', payload);
  useAuthStore.getState().setUser(toStoredUser(data, data.username));
  return data;
}

// Change le mot de passe ; le backend renvoie de nouveaux tokens → on
// rafraîchit la session sans reconnexion.
export async function changePassword(ancien_password, nouveau_password, confirmation) {
  const { data } = await api.post('/auth/change-password/', {
    ancien_password,
    nouveau_password,
    confirmation,
  });
  if (data?.access) {
    useAuthStore.getState().setTokens(data.access, data.refresh);
  }
  return data;
}
