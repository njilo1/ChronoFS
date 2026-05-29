import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import PageTransition from '../animations/PageTransition';
import Toaster from '../ui/Toaster';
import ConfirmHost from '../ui/ConfirmHost';
import useThemeStore from '../../store/themeStore';

export default function Layout() {
  const location = useLocation();
  const theme    = useThemeStore((s) => s.theme);

  // Synchronisation theme ↔ classe `.dark` sur <html>.
  // Le useEffect garantit que la classe DOM suit toujours l'état du store
  // (et donc le re-render des classes Tailwind `dark:*`).
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else                  root.classList.remove('dark');
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden bg-page dark:bg-page-dark">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-paper">
          <div className="max-w-[1400px] mx-auto">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Hôtes globaux : notifications + confirmations */}
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
