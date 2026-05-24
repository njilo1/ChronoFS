import { clsx } from 'clsx';

export default function Button({
  children, variant = 'primary', size = 'md', className, ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary'   && 'bg-gold text-ebg hover:bg-gold-lt active:bg-gold-dk',
        variant === 'secondary' && 'border border-eborder text-etext hover:bg-white/5',
        variant === 'danger'    && 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
        variant === 'ghost'     && 'text-emuted hover:text-etext',
        size === 'sm'  && 'px-3 py-1.5 text-xs',
        size === 'md'  && 'px-4 py-2 text-sm',
        size === 'lg'  && 'px-5 py-2.5 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
