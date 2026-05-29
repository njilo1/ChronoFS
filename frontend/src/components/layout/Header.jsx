import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import useThemeStore from '../../store/themeStore';
import { logout } from '../../services/auth';
import ThemeToggle from '../ui/ThemeToggle';
import HamburgerButton from '../ui/HamburgerButton';

function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.nom || user?.username || 'Utilisateur';
  const initials    = getInitials(displayName);

  // Couleurs réactives directement depuis le state — indépendantes de la
  // classe `.dark` sur <html>. Garantit que le header bascule entre clair et
  // sombre dès le clic.
  const bgHeader  = isDark ? '#0F1729' : '#FFFFFF';
  const borderCol = isDark ? '#1F2A40' : '#E5E2D8';
  const textCol   = isDark ? '#F5F4EE' : '#0B1220';
  const textMuted = isDark ? '#A1A6B0' : '#5B6573';

  return (
    <motion.header
      initial={false}
      animate={{ backgroundColor: bgHeader, borderColor: borderCol }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}
      className="h-14 flex items-center justify-between px-5 shrink-0"
    >
      {/* Gauche : hamburger (ouvre/réduit la sidebar) */}
      <HamburgerButton open={!sidebarCollapsed} onClick={toggleSidebar} />

      {/* Droite : utilisateur + thème + déconnexion */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0  }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center tracking-wide"
            style={{
              backgroundColor: isDark ? '#A67E2E' : '#1E3A8A',
              color:           isDark ? '#0A0F1F' : '#FFFFFF',
            }}
          >
            {initials}
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-[13px] font-semibold" style={{ color: textCol }}>{displayName}</p>
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5" style={{ color: textMuted }}>
              {user?.role || 'Connecté'}
            </p>
          </div>
        </div>

        <span aria-hidden className="h-7 w-px mx-1" style={{ backgroundColor: borderCol }} />

        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="group flex items-center gap-1.5 text-[13px] hover:text-danger transition-colors px-2.5 py-1.5 rounded-md hover:bg-danger/5"
          style={{ color: textMuted }}
        >
          <LogOut size={14} strokeWidth={1.6} className="transition-transform group-hover:translate-x-0.5" />
          <span className="font-medium hidden sm:inline">Déconnexion</span>
        </button>
      </motion.div>
    </motion.header>
  );
}
