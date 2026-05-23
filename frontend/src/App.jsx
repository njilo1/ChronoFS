import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Campus from './pages/Campus'
import Salles from './pages/Salles'
import Departements from './pages/Departements'
import Filieres from './pages/Filieres'
import Enseignants from './pages/Enseignants'
import Matieres from './pages/Matieres'
import Plannings from './pages/Plannings'
import Grille from './pages/Grille'
import ImportExcel from './pages/ImportExcel'
import Sessions from './pages/Sessions'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="campus"       element={<Campus />} />
            <Route path="salles"       element={<Salles />} />
            <Route path="departements" element={<Departements />} />
            <Route path="filieres"     element={<Filieres />} />
            <Route path="enseignants"  element={<Enseignants />} />
            <Route path="matieres"     element={<Matieres />} />
            <Route path="plannings"    element={<Plannings />} />
            <Route path="grille/:id"   element={<Grille />} />
            <Route path="import"       element={<ImportExcel />} />
            <Route path="sessions"     element={<Sessions />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
