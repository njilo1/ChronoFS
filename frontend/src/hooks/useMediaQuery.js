import { useEffect, useState } from 'react';

/**
 * useMediaQuery — s'abonne à une media-query CSS et renvoie son état booléen.
 * SSR-safe (renvoie `false` si window indisponible).
 *
 * Exemple : const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export default function useMediaQuery(query) {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches;

  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // resynchronise au montage (au cas où la query a changé)
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Raccourci : vrai à partir du breakpoint `lg` de Tailwind (≥ 1024 px). */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
