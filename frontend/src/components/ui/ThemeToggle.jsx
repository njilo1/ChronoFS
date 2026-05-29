import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function ThemeToggle({ className = '' }) {
  const theme  = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  // Styles inline — réactivité instantanée au state, indépendamment de la
  // classe `.dark` sur <html>.
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={'group relative inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors ' + className}
      style={{
        backgroundColor: isDark ? '#0F1729' : '#FFFFFF',
        borderColor:     isDark ? '#1F2A40' : '#E5E2D8',
        color:           isDark ? '#C9A227' : '#1E3A8A',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: -25, scale: 0.85 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1    }}
            exit={{    opacity: 0, rotate: 25,  scale: 0.85 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon size={15} strokeWidth={1.6} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: 25,  scale: 0.85 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1    }}
            exit={{    opacity: 0, rotate: -25, scale: 0.85 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun size={15} strokeWidth={1.6} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
