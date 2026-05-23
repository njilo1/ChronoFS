import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Enveloppe une route protégée : redirige vers /login si non connecté
export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}
