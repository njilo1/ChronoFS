import { motion } from 'framer-motion';
import useThemeStore from '../../store/themeStore';
import { EASE_OUT } from '../../lib/motion';

/**
 * PageShell — en-tête de page éditorial.
 *
 * Pour garantir la lisibilité même quand la classe `.dark` n'a pas encore été
 * appliquée sur <html> (cache PWA, hydration tardive, etc.), les couleurs
 * critiques (titre, sous-titre, icône, fond icône) sont appliquées via
 * styles inline réactifs au store Zustand. Cela bypasse complètement les
 * classes Tailwind `dark:*` et garantit la lisibilité.
 */
export default function PageShell({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  count,
  action,
  children,
  // backward-compat : prop `gradient` est acceptée mais ignorée
  gradient: _gradient,
}) {
  const theme  = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const titleColor    = isDark ? '#F5F4EE' : '#0B1220';
  const subtitleColor = isDark ? '#A1A6B0' : '#5B6573';
  const iconBg        = '#1E3A8A';
  const iconFg        = '#FFFFFF';
  const ruleColor     = isDark ? '#1F2A40' : '#E5E2D8';
  const countColor    = isDark ? '#DBBC5E' : '#8B6622';
  const eyebrowColor  = isDark ? '#A1A6B0' : '#5B6573';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
        className="flex items-end justify-between gap-4 flex-wrap pb-4"
        style={{ borderBottom: `1px solid ${ruleColor}` }}
      >
        <div className="flex items-start gap-3.5">
          {Icon && (
            <div
              className="mt-1 p-2 rounded-md shrink-0"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={16} style={{ color: iconFg }} strokeWidth={1.75} />
            </div>
          )}
          <div>
            {eyebrow && (
              <p
                className="mb-1.5 font-bold uppercase"
                style={{ color: eyebrowColor, fontSize: 10, letterSpacing: '0.22em' }}
              >
                {eyebrow}
              </p>
            )}
            <h1
              className="heading-display flex items-baseline gap-3 flex-wrap"
              style={{ color: titleColor, fontSize: '2rem' }}
            >
              <span>{title}</span>
              {count != null && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1    }}
                  transition={{ delay: 0.15 }}
                  className="num font-semibold leading-none"
                  style={{ color: countColor, fontSize: 13 }}
                >
                  · {count}
                </motion.span>
              )}
            </h1>
            {subtitle && (
              <p
                className="text-sm mt-1 max-w-2xl"
                style={{ color: subtitleColor }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0  }}
            transition={{ duration: 0.32, delay: 0.1 }}
          >
            {action}
          </motion.div>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
        className="space-y-5"
      >
        {children}
      </motion.div>
    </div>
  );
}
