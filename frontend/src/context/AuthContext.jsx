import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// Le contexte partagé dans toute l'application
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Initialiser depuis localStorage : si un token existe déjà, l'utilisateur
  // est considéré connecté dès le chargement de la page
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const navigate = useNavigate()

  // login() : envoyer identifiant + mot de passe à Django,
  // stocker les tokens et rediriger vers le dashboard
  async function login(username, password) {
    // On utilise axios directement (pas l'instance api) pour éviter
    // que l'intercepteur de réponse tente de rafraîchir un token inexistant
    const { data } = await axios.post('http://localhost:8000/api/token/', {
      username,
      password,
    })
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setToken(data.access)
    navigate('/dashboard')
  }

  // logout() : vider le stockage et retourner à la page de connexion
  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{
      token,
      isAuthenticated: !!token,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte auth dans n'importe quel composant
export const useAuth = () => useContext(AuthContext)
