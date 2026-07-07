import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import useThemeStore from '../../store/themeStore';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import logoFs from '../../assets/logo_fs.png';
import {
  LayoutDashboard, Calendar, Upload, MapPin,
  DoorOpen, Building2, GraduationCap, Users,
  BookOpen, FileUp, UserCog, Archive, CalendarDays,
  History, LayoutGrid, X,
} from 'lucide-react';

const DAR_NAV = [
  { label: 'Tableau de bord', to: '/dar',                                    icon: LayoutDashboard, end: true },
  { label: 'Semaines',        to: '/dar/semaines',                           icon: Calendar },
  { label: 'Imports',         to: '/dar/imports',                            icon: Upload },
  { label: 'Chefs de dept.',  to: '/dar/chefs',                              icon: UserCog },
  { label: 'Archives',        to: '/dar/archives',                           icon: Archive },
  { type: 'sep', label: 'Référentiel' },
  { label: 'Campus',          to: '/dar/referentiel/campus',                 icon: MapPin },
  { label: 'Salles',          to: '/dar/referentiel/salles',                 icon: DoorOpen },
  { label: 'Départements',    to: '/dar/referentiel/departements',           icon: Building2 },
  { label: 'Filières',        to: '/dar/referentiel/filieres',               icon: GraduationCap },
  { label: 'Enseignants',     to: '/dar/referentiel/enseignants',            icon: Users },
  { label: 'UEs',             to: '/dar/referentiel/ues',                    icon: BookOpen },
  { label: 'Années acad.',    to: '/dar/referentiel/annees-academiques',     icon: CalendarDays },
];

const CHEF_NAV = [
  { label: 'Tableau de bord', to: '/chef',                    icon: LayoutDashboard, end: true },
  { label: 'Importer',        to: '/chef/import',             icon: FileUp },
  { label: 'Mes UEs',         to: '/chef/ues',                icon: BookOpen },
  { label: 'Mes Enseignants', to: '/chef/enseignants',        icon: Users },
  { label: 'Historique',      to: '/chef/historique-envois',  icon: History },
  { label: 'Mon planning',    to: '/chef/planning',           icon: LayoutGrid },
];

/* ───────────────────────────────────────────────────────────────────────
   Item de navigation — "Tablette translucide avec creux à droite".

   Le creux (demi-cercle de la couleur du main content) est ENFANT direct
   du fond translucide actif → il suit automatiquement le glissement via
   `layoutId="sb-active-bg"`, sans timing désynchronisé.
   ─────────────────────────────────────────────────────────────────── */
function SidebarItem({ item, open, notchColor, onNavigate }) {
  const location = useLocation();
  const Icon = item.icon;
  const isActive = item.end
    ? location.pathname === item.to
    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={!open ? item.label : undefined}
      className={
        'group relative flex items-center text-[13px] outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-gold-400/70 focus-visible:ring-inset ' +
        (open
          ? 'gap-3 pl-3 pr-5 min-h-[44px] ml-2 mr-0 rounded-l-md'
          : 'justify-center w-11 h-11 mx-auto rounded-md')
      }
    >
      {isActive && (
        <motion.span
          layoutId="sb-active-bg"
          aria-hidden
          className={
            'absolute inset-0 ' + (open ? 'rounded-l-md' : 'rounded-md')
          }
          style={{
            // Tablette « verre glacé » iOS : pas de filet doré plein, mais une
            // arête dorée givrée à gauche + reflet glossy haut + ombre douce.
            backgroundColor: 'rgba(255,255,255,0.12)',
            backgroundImage:
              'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)',
            boxShadow:
              'inset 0 1px 0 0 rgba(255,255,255,0.22),' +   // reflet glossy haut
              'inset 0 -1px 0 0 rgba(0,0,0,0.20),' +        // ombre basse
              'inset 0 0 0 1px rgba(255,255,255,0.10),' +   // liseré givré
              'inset 12px 0 16px -12px rgba(200,161,90,0.65),' + // arête dorée givrée (remplace le filet dur)
              '0 6px 16px -6px rgba(0,0,0,0.38)',           // halo doux
            backdropFilter: 'blur(7px)',
            WebkitBackdropFilter: 'blur(7px)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
        >
          {/* Le creux : demi-cercle de couleur "main" intégré au fond actif. */}
          {open && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 22,
                backgroundColor: notchColor,
                borderTopLeftRadius: 12,
                borderBottomLeftRadius: 12,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                boxShadow: '-1px 0 2px rgba(0,0,0,0.15)',
              }}
            />
          )}
        </motion.span>
      )}

      {/* Icône */}
      <motion.span
        animate={isActive ? { scale: [0.92, 1] } : { scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0 flex items-center"
      >
        <Icon
          size={16}
          strokeWidth={isActive ? 1.95 : 1.55}
          className={
            'transition-colors duration-200 ' +
            (isActive ? 'text-gold-300' : 'text-white/65 group-hover:text-white')
          }
        />
      </motion.span>

      {/* Label */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{    opacity: 0, x: -4 }}
            transition={{ duration: 0.14 }}
            className={
              'relative z-10 truncate whitespace-nowrap overflow-hidden transition-colors duration-200 ' +
              (isActive
                ? 'text-white font-semibold tracking-tight'
                : 'text-white/65 group-hover:text-white font-medium')
            }
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Hover indicator pour items inactifs en mode déployé */}
      {open && !isActive && (
        <span
          aria-hidden
          className="relative z-10 ml-auto w-1 h-1 rounded-full bg-gold-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      )}
    </Link>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Contenu interne partagé entre la sidebar desktop et le tiroir mobile.
   `open` pilote l'affichage des libellés ; `animate` active l'entrée en
   cascade (uniquement au montage de la sidebar desktop).
   ─────────────────────────────────────────────────────────────────── */
function SidebarBody({ items, role, open, notchColor, animate = true, onNavigate, onClose }) {
  return (
    <>
      {/* En-tête : logo + nom institutionnel */}
      <div className="px-4 pt-5 pb-5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 min-h-[44px]">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white/95 border border-white/20 shrink-0">
            <img src={logoFs} alt="FS-UEB" className="w-full h-full object-cover" />
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="brand"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{    opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="leading-tight overflow-hidden whitespace-nowrap flex-1"
              >
                <p className="text-white font-display font-semibold text-[18px] tracking-tight">
                  Chrono<em className="italic font-normal text-gold-400">FS</em>
                </p>
                <p className="text-white/55 text-[9px] uppercase tracking-[0.22em] font-bold mt-0.5">
                  Faculté des Sciences
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Bouton de fermeture — visible uniquement sur le tiroir mobile */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Fermer le menu"
              className="ml-auto shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-0 space-y-1 sidebar-scroll">
        <LayoutGroup id="sidebar-nav">
          {items.map((item, i) => {
            const reveal = animate
              ? {
                  initial: { opacity: 0, x: -10 },
                  animate: { opacity: 1, x: 0 },
                  transition: { duration: 0.34, delay: 0.06 + i * 0.045, ease: [0.22, 1, 0.36, 1] },
                }
              : {};
            if (item.type === 'sep') {
              return (
                <motion.div key={i} {...reveal} className={'pt-5 pb-1.5 ' + (open ? 'px-4' : 'px-2')}>
                  {open ? (
                    <div className="flex items-center gap-2.5">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[9px] uppercase tracking-[0.28em] text-gold-400/80 font-bold whitespace-nowrap">
                        {item.label}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  ) : (
                    <div className="h-px bg-white/10 mx-2" />
                  )}
                </motion.div>
              );
            }
            return (
              <motion.div key={item.to} {...reveal}>
                <SidebarItem item={item} open={open} notchColor={notchColor} onNavigate={onNavigate} />
              </motion.div>
            );
          })}
        </LayoutGroup>
      </nav>

      {/* Pied de sidebar */}
      <div
        className={'border-t py-4 shrink-0 ' + (open ? 'px-4' : 'px-2 flex justify-center')}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {open ? (
          <div className="flex items-center gap-2.5">
            <span className="pulse-dot bg-gold-400" />
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/55 font-bold leading-snug">
              {role === 'DAR' ? 'Div. Affaires Académiques' : 'Chef de Département'}
            </p>
          </div>
        ) : (
          <span className="pulse-dot bg-gold-400" title="Connecté" />
        )}
      </div>
    </>
  );
}

export default function Sidebar() {
  const { role }            = useAuthStore();
  const sidebarCollapsed    = useUiStore((s) => s.sidebarCollapsed);
  const mobileNavOpen       = useUiStore((s) => s.mobileNavOpen);
  const closeMobileNav      = useUiStore((s) => s.closeMobileNav);
  const theme               = useThemeStore((s) => s.theme);
  const isDark              = theme === 'dark';
  const isDesktop           = useIsDesktop();
  const location            = useLocation();
  const items               = role === 'DAR' ? DAR_NAV : CHEF_NAV;
  const open                = !sidebarCollapsed;

  const bgSidebar  = isDark ? '#06091A' : '#143894';
  const borderCol  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(20,56,148,0.40)';
  const notchColor = isDark ? '#0A0F1F' : '#F4F6FC';

  // Ferme le tiroir mobile à chaque changement de route.
  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  // ── Mobile (< lg) : tiroir overlay coulissant + voile ──────────────────
  if (!isDesktop) {
    return (
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Voile sombre — ferme au clic */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileNav}
              className="absolute inset-0 bg-ink-strong/60 dark:bg-black/70"
            />
            {/* Tiroir */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              style={{ backgroundColor: bgSidebar }}
              className="absolute inset-y-0 left-0 w-[min(82vw,280px)] flex flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navigation"
            >
              <SidebarBody
                items={items}
                role={role}
                open
                notchColor={notchColor}
                animate={false}
                onNavigate={closeMobileNav}
                onClose={closeMobileNav}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop (≥ lg) : sidebar en flux, repliable ────────────────────────
  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 240 : 64, backgroundColor: bgSidebar }}
      transition={{
        width:           { type: 'spring', stiffness: 360, damping: 36 },
        backgroundColor: { duration: 0.28, ease: 'easeOut' },
      }}
      style={{ borderRightColor: borderCol }}
      className="flex flex-col shrink-0 relative border-r shadow-sidebar overflow-visible rounded-r-xl"
    >
      <SidebarBody items={items} role={role} open={open} notchColor={notchColor} />
    </motion.aside>
  );
}
