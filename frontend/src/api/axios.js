import axios from 'axios'

// Instance Axios configurée pour ChronoFS
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

// Avant chaque requête : attacher le token JWT depuis localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Après chaque réponse : si 401 → essayer de rafraîchir le token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // _retry évite une boucle infinie si le refresh lui-même échoue
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post('http://localhost:8000/api/token/refresh/', { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original) // relancer la requête originale avec le nouveau token
      } catch {
        // Refresh échoué → déconnexion forcée
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
