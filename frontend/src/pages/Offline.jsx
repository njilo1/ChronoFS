import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import logoFs from '../assets/logo_fs.png';

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4">
      <motion.div
        className="text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-card">
          <img src={logoFs} alt="FS-UEB" className="w-full h-full object-cover" />
        </div>
        <div className="w-12 h-12 rounded-full bg-ink-muted/10 flex items-center justify-center mx-auto mb-4">
          <WifiOff size={22} className="text-ink-muted" />
        </div>
        <h1 className="text-xl font-bold text-ink-strong mb-2">Connexion perdue</h1>
        <p className="text-ink-muted text-sm leading-relaxed mb-6">
          Vous êtes actuellement hors ligne. Vérifiez votre connexion internet et réessayez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          Réessayer
        </button>
      </motion.div>
    </div>
  );
}
