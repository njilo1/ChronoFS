import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';

import DarDashboard    from './pages/dar/Dashboard';
import DarSemaines     from './pages/dar/Semaines';
import DarPlanning     from './pages/dar/Planning';
import DarImports      from './pages/dar/Imports';
import Campus          from './pages/dar/referentiel/Campus';
import Salles          from './pages/dar/referentiel/Salles';
import Departements    from './pages/dar/referentiel/Departements';
import Filieres        from './pages/dar/referentiel/Filieres';
import Enseignants     from './pages/dar/referentiel/Enseignants';
import UEs             from './pages/dar/referentiel/UEs';

import ChefDashboard   from './pages/chef-dept/Dashboard';
import ChefImport      from './pages/chef-dept/mon-departement/Import';
import ChefUEs         from './pages/chef-dept/mon-departement/UEs';
import ChefEnseignants from './pages/chef-dept/mon-departement/Enseignants';

function Protected({ children, role: required }) {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (required && role !== required) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'DAR')       return <Navigate to="/dar"  replace />;
  if (role === 'CHEF_DEPT') return <Navigate to="/chef" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"      element={<RoleRedirect />} />

        {/* DAR */}
        <Route path="/dar" element={<Protected role="DAR"><Layout /></Protected>}>
          <Route index                              element={<DarDashboard />} />
          <Route path="semaines"                   element={<DarSemaines />} />
          <Route path="semaines/:id/planning"      element={<DarPlanning />} />
          <Route path="imports"                    element={<DarImports />} />
          <Route path="referentiel/campus"         element={<Campus />} />
          <Route path="referentiel/salles"         element={<Salles />} />
          <Route path="referentiel/departements"   element={<Departements />} />
          <Route path="referentiel/filieres"       element={<Filieres />} />
          <Route path="referentiel/enseignants"    element={<Enseignants />} />
          <Route path="referentiel/ues"            element={<UEs />} />
        </Route>

        {/* Chef Dept */}
        <Route path="/chef" element={<Protected role="CHEF_DEPT"><Layout /></Protected>}>
          <Route index               element={<ChefDashboard />} />
          <Route path="import"       element={<ChefImport />} />
          <Route path="ues"          element={<ChefUEs />} />
          <Route path="enseignants"  element={<ChefEnseignants />} />
        </Route>

        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
