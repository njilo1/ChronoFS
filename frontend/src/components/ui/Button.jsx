import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { SPRING } from '../../lib/motion';

export default function Button({
  children, variant = 'primary', size = 'md', className, ...props
}) {
  return (
    <motion.button
      whileHover={{ y: props.disabled ? 0 : -1 }}
      whileTap={{   scale: props.disabled ? 1 : 0.97 }}
      transition={SPRING.tap}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md',
        'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-page dark:focus-visible:ring-offset-page-dark',

        variant === 'primary' && [
          'bg-primary-900 text-white shadow-card',
          'hover:bg-primary-800 hover:shadow-card-md',
          'dark:bg-gold-500 dark:text-page-dark dark:hover:bg-gold-400',
        ],
        variant === 'secondary' && [
          'border border-line bg-surface text-ink',
          'hover:border-primary-900/40 hover:bg-surface-alt',
          'dark:border-line-dark dark:bg-surface-dark-alt dark:text-ink-dark',
          'dark:hover:border-gold-400/40 dark:hover:bg-surface-dark',
        ],
        variant === 'danger' && [
          'border border-danger/40 text-danger bg-surface',
          'hover:bg-danger/5 hover:border-danger',
          'dark:bg-surface-dark-alt dark:text-danger',
        ],
        variant === 'ghost' && [
          'text-ink-muted hover:text-ink-strong hover:bg-surface-alt',
          'dark:text-ink-dark-muted dark:hover:text-ink-dark-strong dark:hover:bg-surface-dark-alt',
        ],

        size === 'sm'  && 'px-3 py-1.5 text-xs',
        size === 'md'  && 'px-4 py-2 text-sm',
        size === 'lg'  && 'px-5 py-2.5 text-[15px]',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
