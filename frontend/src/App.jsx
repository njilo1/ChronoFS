import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';

import DarDashboard       from './pages/dar/Dashboard';
import DarSemaines        from './pages/dar/Semaines';
import DarPlanning        from './pages/dar/Planning';
import DarImports         from './pages/dar/Imports';
import DarChefs           from './pages/dar/Chefs';
import DarArchives        from './pages/dar/Archives';
import Campus             from './pages/dar/referentiel/Campus';
import Salles             from './pages/dar/referentiel/Salles';
import Departements       from './pages/dar/referentiel/Departements';
import Filieres           from './pages/dar/referentiel/Filieres';
import Enseignants        from './pages/dar/referentiel/Enseignants';
import UEs                from './pages/dar/referentiel/UEs';
import AnneesAcademiques  from './pages/dar/referentiel/AnneesAcademiques';

import ChefDashboard      from './pages/chef-dept/Dashboard';
import ChefImport         from './pages/chef-dept/mon-departement/Import';
import ChefUEs            from './pages/chef-dept/mon-departement/UEs';
import ChefEnseignants    from './pages/chef-dept/mon-departement/Enseignants';
import HistoriqueEnvois   from './pages/chef-dept/HistoriqueEnvois';
import ConsulterPlanning  from './pages/chef-dept/ConsulterPlanning';

import AdminDashboard     from './pages/superadmin/Dashboard';
import AdminComptes       from './pages/superadmin/Comptes';
import AdminContraintes   from './pages/superadmin/Contraintes';
import AdminObjectifs     from './pages/superadmin/Objectifs';
import AdminJournal       from './pages/superadmin/Journal';

import Offline            from './pages/Offline';

function Protected({ children, role: required }) {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (required && role !== required) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'SUPERADMIN') return <Navigate to="/superadmin" replace />;
  if (role === 'DAR')        return <Navigate to="/dar"  replace />;
  if (role === 'CHEF_DEPT')  return <Navigate to="/chef" replace />;
  return <Navigate to="/login" replace />;
}

/* Accueil : landing publique pour les visiteurs, redirection vers
   l'espace métier pour les utilisateurs déjà connectés. */
function HomeGate() {
  const { token } = useAuthStore();
  return token ? <RoleRedirect /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"      element={<HomeGate />} />

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
          <Route path="referentiel/ues"                        element={<UEs />} />
          <Route path="referentiel/annees-academiques"         element={<AnneesAcademiques />} />
          <Route path="chefs"                                  element={<DarChefs />} />
          <Route path="archives"                               element={<DarArchives />} />
        </Route>

        {/* Super-administrateur */}
        <Route path="/superadmin" element={<Protected role="SUPERADMIN"><Layout /></Protected>}>
          <Route index                element={<AdminDashboard />} />
          <Route path="comptes"       element={<AdminComptes />} />
          <Route path="contraintes"   element={<AdminContraintes />} />
          <Route path="objectifs"     element={<AdminObjectifs />} />
          <Route path="journal"       element={<AdminJournal />} />
        </Route>

        {/* Chef Dept */}
        <Route path="/chef" element={<Protected role="CHEF_DEPT"><Layout /></Protected>}>
          <Route index               element={<ChefDashboard />} />
          <Route path="import"       element={<ChefImport />} />
          <Route path="ues"          element={<ChefUEs />} />
          <Route path="enseignants"        element={<ChefEnseignants />} />
          <Route path="historique-envois"  element={<HistoriqueEnvois />} />
          <Route path="planning"           element={<ConsulterPlanning />} />
        </Route>

        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
