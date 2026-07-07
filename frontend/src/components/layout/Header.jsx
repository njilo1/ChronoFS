import { useState } from 'react';
import { LogOut, ChevronDown, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import useThemeStore from '../../store/themeStore';
import { logout } from '../../services/auth';
import ThemeToggle from '../ui/ThemeToggle';
import HamburgerButton from '../ui/HamburgerButton';
import ProfilModal from '../ui/ProfilModal';
import NotificationBell from './NotificationBell';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import logoFs from '../../assets/logo_fs.png';

function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, toggleMobileNav } = useUiStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // On affiche le nom d'utilisateur (username) : il est modifiable dans « Mon
  // profil » et se répercute ici dès l'enregistrement (le store est rafraîchi).
  const displayName = user?.username || user?.nom || 'Utilisateur';
  const initials    = getInitials(displayName);

  // Couleurs réactives directement depuis le state — indépendantes de la
  // classe `.dark` sur <html>. Garantit que le header bascule entre clair et
  // sombre dès le clic.
  const bgHeader  = isDark ? '#0F1729' : '#FFFFFF';
  const borderCol = isDark ? '#1F2A40' : '#E6ECF7';
  const textCol   = isDark ? '#F5F4EE' : '#1C2333';
  const textMuted = isDark ? '#A1A6B0' : '#667085';
  const menuBg    = isDark ? '#111827' : '#FFFFFF';

  return (
    <motion.header
      initial={false}
      animate={{ backgroundColor: bgHeader, borderColor: borderCol }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}
      className="h-14 flex items-center justify-between px-5 shrink-0 relative z-30"
    >
      {/* Gauche : hamburger + marque (sur mobile, la sidebar est masquée).
          - Desktop : le hamburger replie/déploie la sidebar.
          - Mobile  : le hamburger ouvre/ferme le tiroir de navigation. */}
      <div className="flex items-center gap-3 min-w-0">
        <HamburgerButton
          open={isDesktop ? !sidebarCollapsed : mobileNavOpen}
          onClick={isDesktop ? toggleSidebar : toggleMobileNav}
        />
        <div className="flex items-center gap-2 lg:hidden min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white border shrink-0" style={{ borderColor: borderCol }}>
            <img src={logoFs} alt="FS-UEB" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-semibold text-[17px] tracking-tight truncate" style={{ color: textCol }}>
            Chrono<em className="italic font-normal" style={{ color: isDark ? '#D9BC7E' : '#8E6F38' }}>FS</em>
          </span>
        </div>
      </div>

      {/* Droite : thème + menu utilisateur */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0  }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="flex items-center gap-3"
      >
        <NotificationBell />

        <ThemeToggle />

        <span aria-hidden className="h-7 w-px" style={{ backgroundColor: borderCol }} />

        {/* Menu utilisateur */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center tracking-wide shrink-0"
              style={{
                backgroundColor: isDark ? '#8E6F38' : '#143894',
                color:           isDark ? '#0A0F1F' : '#FFFFFF',
              }}
            >
              {initials}
            </div>
            <div className="leading-tight hidden sm:block text-left">
              <p className="text-[13px] font-semibold" style={{ color: textCol }}>{displayName}</p>
              <p className="text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5" style={{ color: textMuted }}>
                {user?.role || 'Connecté'}
              </p>
            </div>
            <motion.span animate={{ rotate: menuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} style={{ color: textMuted }} />
            </motion.span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                {/* Zone de fermeture au clic extérieur */}
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{    opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-52 rounded-xl border shadow-card-lg overflow-hidden z-20 py-1"
                  style={{ backgroundColor: menuBg, borderColor: borderCol }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                    style={{ color: textCol }}
                  >
                    <UserCog size={15} strokeWidth={1.7} className="text-primary-700 dark:text-primary-300" />
                    Mon profil
                  </button>
                  <div className="h-px mx-2 my-1" style={{ backgroundColor: borderCol }} />
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="group w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-danger hover:bg-danger/5 transition-colors"
                  >
                    <LogOut size={15} strokeWidth={1.7} className="transition-transform group-hover:translate-x-0.5" />
                    Déconnexion
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <ProfilModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </motion.header>
  );
}
