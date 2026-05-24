import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  LayoutDashboard, Calendar, Upload, MapPin,
  DoorOpen, Building2, GraduationCap, Users,
  BookOpen, FileUp,
} from 'lucide-react';

const DAR_NAV = [
  { label: 'Tableau de bord', to: '/dar',                            icon: LayoutDashboard, end: true },
  { label: 'Semaines',        to: '/dar/semaines',                   icon: Calendar },
  { label: 'Imports',         to: '/dar/imports',                    icon: Upload },
  { type: 'sep', label: 'Référentiel' },
  { label: 'Campus',          to: '/dar/referentiel/campus',         icon: MapPin },
  { label: 'Salles',          to: '/dar/referentiel/salles',         icon: DoorOpen },
  { label: 'Départements',    to: '/dar/referentiel/departements',   icon: Building2 },
  { label: 'Filières',        to: '/dar/referentiel/filieres',       icon: GraduationCap },
  { label: 'Enseignants',     to: '/dar/referentiel/enseignants',    icon: Users },
  { label: 'UEs',             to: '/dar/referentiel/ues',            icon: BookOpen },
];

const CHEF_NAV = [
  { label: 'Tableau de bord', to: '/chef',             icon: LayoutDashboard, end: true },
  { label: 'Importer',        to: '/chef/import',      icon: FileUp },
  { label: 'Mes UEs',         to: '/chef/ues',         icon: BookOpen },
  { label: 'Mes Enseignants', to: '/chef/enseignants', icon: Users },
];

export default function Sidebar() {
  const { role } = useAuthStore();
  const items = role === 'DAR' ? DAR_NAV : CHEF_NAV;

  return (
    <aside className="w-56 bg-esb border-r border-eborder flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-eborder flex items-center gap-3">
        <div className="w-8 h-8 bg-gold/10 border border-gold/40 rounded flex items-center justify-center shrink-0">
          <span className="text-gold font-display text-sm font-semibold">FS</span>
        </div>
        <div>
          <p className="text-etext text-sm font-semibold font-display leading-none">ChronoFS</p>
          <p className="text-emuted text-[10px] uppercase tracking-widest mt-0.5">FS · UEB</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item, i) => {
          if (item.type === 'sep') {
            return (
              <p key={i} className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-emuted font-medium">
                {item.label}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all ${
                  isActive
                    ? 'bg-gold/10 text-gold border-l-2 border-gold'
                    : 'text-emuted hover:text-etext hover:bg-white/5 border-l-2 border-transparent'
                }`
              }
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role label */}
      <div className="px-4 py-3 border-t border-eborder">
        <p className="text-[9px] uppercase tracking-widest text-emuted leading-snug">
          {role === 'DAR' ? 'Div. Affaires Académiques' : 'Chef de Département'}
        </p>
      </div>
    </aside>
  );
}
