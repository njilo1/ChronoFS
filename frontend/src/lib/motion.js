/**
 * Tokens de mouvement ChronoFS — direction « Academic Press ».
 *
 * Centralise les durées, courbes et variants déjà disséminés en dur dans
 * l'application afin que toutes les animations partagent le même « rythme ».
 * Les valeurs sont IDENTIQUES à celles utilisées jusqu'ici : aucun changement
 * visuel, uniquement de la cohérence et de la réutilisabilité.
 *
 * La réduction de mouvement est gérée globalement par
 * <MotionConfig reducedMotion="user"> (voir src/main.jsx) : inutile de la
 * traiter ici.
 */

// Courbe d'apparition signature (ease-out doux), déjà utilisée partout.
export const EASE_OUT = [0.22, 1, 0.36, 1];

// Durées standard, en secondes.
export const DUR = {
  fast: 0.16, // micro-interactions, menus
  base: 0.28, // transitions courantes
  slow: 0.4,  // entrées de sections
};

// Ressorts physiques réutilisables, calés sur les réglages déjà en place
// (valeurs reprises telles quelles → aucun changement de ressenti).
export const SPRING = {
  // Réactif — feedback de pression des boutons (whileHover / whileTap).
  tap: { type: 'spring', stiffness: 420, damping: 22 },
  // Surface qui entre — modale, popovers.
  surface: { type: 'spring', stiffness: 440, damping: 32 },
  // Grand panneau — largeur de la sidebar, déplacements amples.
  soft: { type: 'spring', stiffness: 360, damping: 36 },
};

// Apparition « fondu + montée » : l'entrée de référence des sections.
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: DUR.base, ease: EASE_OUT },
};

// Fondu simple.
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.base, ease: EASE_OUT },
};

// Conteneur orchestrant l'entrée échelonnée de ses enfants.
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.045, delayChildren: 0.06 },
  },
};

// Enfant d'un staggerContainer.
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE_OUT },
  },
};
