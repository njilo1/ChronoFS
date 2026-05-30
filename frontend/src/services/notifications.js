import api from './api';

const arr = (r) => (Array.isArray(r.data) ? r.data : (r.data?.results ?? []));

export async function fetchNotifications() {
  const r = await api.get('/notifications/');
  return arr(r);
}

export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/compteur/');
  return data?.non_lues ?? 0;
}

export async function markRead(id) {
  const { data } = await api.post(`/notifications/${id}/lire/`);
  return data;
}

export async function markAllRead() {
  await api.post('/notifications/tout-lire/');
}
