import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import useThemeStore from '../../store/themeStore';
import logoFs from '../../assets/logo_fs.png';
import {
  LayoutDashboard, Calendar, Upload, MapPin,
  DoorOpen, Building2, GraduationCap, Users,
  BookOpen, FileUp, UserCog, Archive, CalendarDays,
  History, LayoutGrid,
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

   Le Link colle au bord droit de la sidebar (ml-2 mr-0) pour que le creux
   apparaisse pile à la frontière sidebar/main, donnant l'illusion d'un
   véritable trou dans la sidebar révélant la page derrière.
   ─────────────────────────────────────────────────────────────────── */
function SidebarItem({ item, open, notchColor }) {
  const location = useLocation();
  const Icon = item.icon;
  const isActive = item.end
    ? location.pathname === item.to
    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  return (
    <Link
      to={item.to}
      title={!open ? item.label : undefined}
      className={
        'group relative flex items-center text-[13px] outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-gold-400/70 focus-visible:ring-inset ' +
        (open
          ? 'gap-3 pl-3 pr-5 py-2 h-9 ml-2 mr-0 rounded-l-md'
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
            backgroundColor: 'rgba(255,255,255,0.10)',
            boxShadow:
              'inset 3px 0 0 0 #C9A227,' +
              'inset 0 1px 0 0 rgba(255,255,255,0.06),' +
              'inset 0 -1px 0 0 rgba(0,0,0,0.10)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
        >
          {/* Le creux : demi-cercle de couleur "main" intégré au fond actif.
              Comme c'est un enfant du motion.span layoutId, il glisse en
              synchronie parfaite — aucune désynchro possible. */}
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

export default function Sidebar() {
  const { role }            = useAuthStore();
  const sidebarCollapsed    = useUiStore((s) => s.sidebarCollapsed);
  const theme               = useThemeStore((s) => s.theme);
  const isDark              = theme === 'dark';
  const items               = role === 'DAR' ? DAR_NAV : CHEF_NAV;
  const open                = !sidebarCollapsed;

  const bgSidebar  = isDark ? '#06091A' : '#1E3A8A';
  const borderCol  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,31,71,0.40)';
  // Couleur du creux = couleur du main content, selon le thème
  const notchColor = isDark ? '#0A0F1F' : '#FAFAF7';

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
      {/* En-tête : logo + nom institutionnel */}
      <div className="px-4 pt-5 pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
                className="leading-tight overflow-hidden whitespace-nowrap"
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
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-0 space-y-1 sidebar-scroll">
        <LayoutGroup id="sidebar-nav">
          {items.map((item, i) => {
            // Entrée échelonnée au montage de la sidebar (une seule fois,
            // à l'arrivée dans l'espace authentifié — pas à chaque navigation).
            const reveal = {
              initial: { opacity: 0, x: -10 },
              animate: { opacity: 1, x: 0 },
              transition: { duration: 0.34, delay: 0.06 + i * 0.045, ease: [0.22, 1, 0.36, 1] },
            };
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
                <SidebarItem item={item} open={open} notchColor={notchColor} />
              </motion.div>
            );
          })}
        </LayoutGroup>
      </nav>

      {/* Pied de sidebar */}
      <div
        className={'border-t py-4 ' + (open ? 'px-4' : 'px-2 flex justify-center')}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {open ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="pulse-dot bg-gold-400" />
              <p className="text-[9px] uppercase tracking-[0.22em] text-white/55 font-bold leading-snug">
                {role === 'DAR' ? 'Div. Affaires Académiques' : 'Chef de Département'}
              </p>
            </div>
          </>
        ) : (
          <span className="pulse-dot bg-gold-400" title="Connecté" />
        )}
      </div>
    </motion.aside>
  );
}
