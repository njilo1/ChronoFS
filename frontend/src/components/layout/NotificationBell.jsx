import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, FolderOpen, Lock, CheckCircle2, Inbox, UserPlus, KeyRound, CheckCheck,
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import { toast } from '../../store/toastStore';
import {
  fetchNotifications, fetchUnreadCount, markRead, markAllRead,
} from '../../services/notifications';

const POLL_MS = 45000;

// Icône + couleur par type de notification (palette bleue/sémantique, pas d'or).
const TYPE_META = {
  IMPORTS_OUVERTS:    { Icon: FolderOpen,  color: '#1E3A8A' },
  IMPORTS_CLOTURES:   { Icon: Lock,        color: '#B45309' },
  PLANNING_PUBLIE:    { Icon: CheckCircle2, color: '#0F6B45' },
  PLANNING_RECU:      { Icon: Inbox,       color: '#1D4ED8' },
  COMPTE_CREE:        { Icon: UserPlus,    color: '#0891B2' },
  MOT_DE_PASSE_RESET: { Icon: KeyRound,    color: '#B45309' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60)    return "à l'instant";
  if (s < 3600)  return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const isDark   = useThemeStore((s) => s.theme === 'dark');
  const navigate = useNavigate();

  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState([]);
  const [count, setCount]   = useState(0);
  const [loading, setLoading] = useState(false);
  const prevCount = useRef(null);

  const textCol   = isDark ? '#F5F4EE' : '#0B1220';
  const textMuted = isDark ? '#A1A6B0' : '#5B6573';
  const borderCol = isDark ? '#1F2A40' : '#E5E2D8';

  // Rafraîchit le compteur ; toast si de NOUVELLES notifs sont arrivées.
  const refreshCount = useCallback(async () => {
    try {
      const n = await fetchUnreadCount();
      if (prevCount.current != null && n > prevCount.current) {
        const diff = n - prevCount.current;
        toast.info(diff > 1 ? `${diff} nouvelles notifications` : 'Nouvelle notification');
      }
      prevCount.current = n;
      setCount(n);
    } catch { /* silencieux : réseau */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchNotifications());
    } catch { /* silencieux */ } finally {
      setLoading(false);
    }
  }, []);

  // Polling + rafraîchissement au focus de l'onglet.
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [refreshCount]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleClick = async (notif) => {
    setOpen(false);
    if (!notif.lu) {
      setItems((arr) => arr.map((n) => (n.id === notif.id ? { ...n, lu: true } : n)));
      setCount((c) => Math.max(0, c - 1));
      prevCount.current = Math.max(0, (prevCount.current ?? 1) - 1);
      markRead(notif.id).catch(() => {});
    }
    if (notif.lien) navigate(notif.lien);
  };

  const handleMarkAll = async () => {
    setItems((arr) => arr.map((n) => ({ ...n, lu: true })));
    setCount(0);
    prevCount.current = 0;
    markAllRead().catch(() => {});
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ color: textMuted }}
      >
        <Bell size={18} strokeWidth={1.7} />
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center
                         rounded-full bg-danger text-white text-[10px] font-bold leading-none"
            >
              {count > 9 ? '9+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 mt-2 w-[330px] max-w-[86vw] rounded-xl border shadow-card-lg overflow-hidden z-20
                         bg-white dark:bg-surface-dark"
              style={{ borderColor: borderCol }}
            >
              {/* En-tête */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: borderCol }}>
                <p className="text-[13px] font-bold" style={{ color: textCol }}>Notifications</p>
                {count > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300 hover:underline"
                  >
                    <CheckCheck size={13} /> Tout marquer comme lu
                  </button>
                )}
              </div>

              {/* Liste */}
              <div className="max-h-[360px] overflow-y-auto">
                {loading && items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px]" style={{ color: textMuted }}>Chargement…</p>
                ) : items.length === 0 ? (
                  <div className="px-4 py-10 flex flex-col items-center gap-2" style={{ color: textMuted }}>
                    <Bell size={22} strokeWidth={1.4} />
                    <p className="text-[13px]">Aucune notification.</p>
                  </div>
                ) : (
                  items.map((n) => {
                    const meta = TYPE_META[n.type] ?? { Icon: Bell, color: '#1E3A8A' };
                    const Icon = meta.Icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                                   hover:bg-primary-50/60 dark:hover:bg-primary-950/20 border-b last:border-b-0"
                        style={{ borderColor: borderCol, backgroundColor: n.lu ? 'transparent' : (isDark ? 'rgba(82,119,174,0.08)' : 'rgba(30,58,138,0.04)') }}
                      >
                        <span className="mt-0.5 shrink-0 p-1.5 rounded-lg" style={{ backgroundColor: `${meta.color}1A` }}>
                          <Icon size={14} style={{ color: meta.color }} strokeWidth={1.8} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold truncate" style={{ color: textCol }}>{n.titre}</span>
                            {!n.lu && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />}
                          </span>
                          {n.message && (
                            <span className="block text-[12px] leading-snug mt-0.5 line-clamp-2" style={{ color: textMuted }}>
                              {n.message}
                            </span>
                          )}
                          <span className="block text-[10.5px] mt-1" style={{ color: textMuted }}>{timeAgo(n.created_at)}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
