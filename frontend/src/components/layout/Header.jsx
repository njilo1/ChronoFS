import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { logout } from '../../services/auth';

export default function Header() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-12 border-b border-eborder bg-esb flex items-center justify-end px-5 shrink-0 gap-4">
      <div className="flex items-center gap-2 text-sm text-emuted">
        <User size={14} />
        <span>{user?.nom || user?.username || 'Utilisateur'}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm text-emuted hover:text-red-400 transition-colors"
      >
        <LogOut size={14} />
        <span>Déconnexion</span>
      </button>
    </header>
  );
}
