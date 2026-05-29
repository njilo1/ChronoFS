import useThemeStore from '../../store/themeStore';

/**
 * HamburgerButton — bouton 3-traits custom.
 * `open=true` → menu déployé (3 traits forment un X)
 * `open=false`→ menu réduit (3 traits horizontaux)
 *
 * Couleurs appliquées via styles inline qui lisent directement le store de
 * thème : réactivité immédiate, indépendante de la classe `.dark`.
 */
export default function HamburgerButton({ open, onClick, className = '' }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Réduire le menu' : 'Déployer le menu'}
      title={open ? 'Réduire le menu' : 'Déployer le menu'}
      className={'group relative inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors ' + className}
      style={{
        backgroundColor: isDark ? '#0F1729' : '#FFFFFF',
        borderColor:     isDark ? '#1F2A40' : '#E5E2D8',
        color:           isDark ? '#F5F4EE' : '#0B1220',
      }}
    >
      <span className="relative w-4 h-3.5 flex flex-col justify-between items-stretch">
        <span
          className={
            'block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300 ease-out ' +
            (open ? 'rotate-45 translate-y-[6px]' : '')
          }
        />
        <span
          className={
            'block h-[1.5px] bg-current rounded-full transition-all duration-200 ' +
            (open ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100')
          }
        />
        <span
          className={
            'block h-[1.5px] bg-current rounded-full origin-center transition-all duration-300 ease-out ' +
            (open ? '-rotate-45 -translate-y-[6px]' : '')
          }
        />
      </span>
    </button>
  );
}
