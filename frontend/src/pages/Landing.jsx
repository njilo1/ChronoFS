// Landing publique de ChronoFS — direction « Bleu institutionnel ».
// Charte : bleu principal UEB (#143894) + blanc + bleus très clairs, touches
// ambre ultra-ponctuelles (tampon, numéros d'étape, coches du solveur).
// Titres en Cormorant Garamond, corps en Plus Jakarta Sans, registre
// technique en JetBrains Mono. Pièce signature : la grille EDT vivante —
// le solveur lit les demandes, place la semaine, détecte un conflit,
// le résout, puis scelle l'emploi du temps « SANS CONFLIT ».

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useReducedMotion, useInView, animate,
} from 'framer-motion';
import {
  ArrowRight, ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, ChevronRight, Cpu, Database,
  FileSpreadsheet, FileText, History, MonitorSmartphone, Upload, Send,
  CalendarDays, CalendarClock, Building2, Users, DoorOpen, ShieldCheck, Lock,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import logoFs from '../assets/logo_fs.png';

/* ─── Constantes de charte ───────────────────────────────────────────── */

const easeOut = [0.22, 1, 0.36, 1];

/* ─── Micro-composants ───────────────────────────────────────────────── */

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

/* Eyebrow bleu : petit label uppercase précédé d'un filet. */
function Eyebrow({ children, center = false, className = '' }) {
  return (
    <p
      className={
        'flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] ' +
        'text-primary-600 dark:text-primary-300 ' +
        (center ? 'justify-center ' : '') + className
      }
    >
      <span aria-hidden="true" className="inline-block w-7 h-px bg-primary-400/70 dark:bg-primary-400/50" />
      {children}
      {center && <span aria-hidden="true" className="inline-block w-7 h-px bg-primary-400/70 dark:bg-primary-400/50" />}
    </p>
  );
}

/* Compteur : le chiffre monte jusqu'à sa valeur quand il entre à l'écran. */
function Compteur({ valeur, className = '' }) {
  const ref     = useRef(null);
  const inView  = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [affiche, setAffiche] = useState(reduced ? valeur : 0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduced) { setAffiche(valeur); return undefined; }
    const ctrl = animate(0, valeur, {
      duration: 1.2,
      delay: 0.1,
      ease: easeOut,
      onUpdate: (v) => setAffiche(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [inView, reduced, valeur]);

  return <span ref={ref} className={className}>{affiche}</span>;
}

/* Bouton primaire bleu plein, avec flèche qui glisse au survol. */
function BtnPrimary({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={
        'group inline-flex items-center justify-center gap-2 min-h-[48px] px-7 rounded-xl ' +
        'bg-primary-900 text-white text-sm font-semibold tracking-tight ' +
        'shadow-[0_6px_18px_-6px_rgba(20,56,148,0.45)] ' +
        'hover:bg-primary-800 hover:shadow-[0_10px_26px_-8px_rgba(20,56,148,0.5)] ' +
        'active:scale-[0.98] transition-[background-color,box-shadow,transform] duration-200 ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ' +
        'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-page-dark ' +
        'dark:bg-primary-600 dark:hover:bg-primary-500 ' + className
      }
    >
      {children}
      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

/* Bouton fantôme, bordure bleu clair. */
function BtnGhost({ onClick, href, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl
        border border-primary-200 bg-white/70 text-sm font-semibold text-primary-800 cursor-pointer
        hover:border-primary-400 hover:bg-primary-50 active:scale-[0.98]
        transition-[border-color,background-color,transform] duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
        dark:border-primary-400/30 dark:bg-white/[0.04] dark:text-primary-200 dark:hover:border-primary-400/60 dark:hover:bg-white/[0.06]"
    >
      {children}
      <ArrowDown size={14} className="transition-transform duration-200 group-hover:translate-y-1" aria-hidden="true" />
    </a>
  );
}

/* Défilement doux vers une ancre, en respectant reduced-motion. */
const smoothTo = (id) => (e) => {
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};

/* ─── Pièce signature : la grille EDT vivante ─────────────────────────────
   Semaine réelle : LUN→SAM, créneaux 07h / 10h / 13h / 16h.
   Chorégraphie en boucle : lecture → placement → conflit → réaffectation →
   tampon « SANS CONFLIT » → fondu, puis recommence. */

const SLOTS = ['07h', '10h', '13h', '16h'];
const DAYS  = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

const SEANCES = [
  { code: 'INF 101', salle: 'Salle A', d: 0, s: 0, tone: 'navy' },
  { code: 'MAT 201', salle: 'Salle B', d: 2, s: 0, tone: 'navy' },
  { code: 'PHY 201', salle: 'Salle D', d: 4, s: 0, tone: 'navy' },
  { code: 'BIO 102', salle: 'Salle H', d: 5, s: 0, tone: 'gold' },
  { code: 'MAT 301', salle: 'Salle D', d: 1, s: 1, tone: 'navy' },
  { code: 'BIO 103', salle: 'Salle F', d: 3, s: 1, tone: 'navy' },
  { code: 'INF 201', salle: 'Salle D', d: 0, s: 2, tone: 'navy' },
  { code: 'STA 301', salle: 'Salle E', d: 4, s: 2, tone: 'gold' },
  { code: 'MAT 201', salle: 'Salle E', d: 0, s: 3, tone: 'gold' },
  { code: 'MAT 202', salle: 'Salle C', d: 3, s: 3, tone: 'gold' },
];

const CONFLIT = {
  code: 'ANG 202', salle: 'Salle F',
  from: { d: 3, s: 1 },   // se pose sur BIO 103 (jeudi 10h)
  to:   { d: 2, s: 2 },   // réaffecté mercredi 13h (libre)
};

const TONES = {
  navy: 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-primary-900/40 dark:border-primary-400/25 dark:text-primary-100',
  gold: 'bg-gold-50 border-gold-200 text-gold-700 dark:bg-gold-400/10 dark:border-gold-400/30 dark:text-gold-200',
};

const NB_CONTRAINTES = 3412;

function GrilleVivante() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState('draw');
  const [cycle, setCycle] = useState(0);
  const [contraintes, setContraintes] = useState(reduced ? NB_CONTRAINTES : 0);

  useEffect(() => {
    if (reduced) { setPhase('stamp'); return undefined; }
    setPhase('draw');
    const ids = [
      setTimeout(() => setPhase('place'),    450),
      setTimeout(() => setPhase('conflict'), 2600),
      setTimeout(() => setPhase('resolve'),  3800),
      setTimeout(() => setPhase('stamp'),    4650),
      setTimeout(() => setPhase('fade'),     8900),
      setTimeout(() => setCycle((c) => c + 1), 9550),
    ];
    return () => ids.forEach(clearTimeout);
  }, [cycle, reduced]);

  useEffect(() => {
    if (reduced) return undefined;
    if (phase === 'draw') { setContraintes(0); return undefined; }
    if (phase !== 'place') { setContraintes(NB_CONTRAINTES); return undefined; }
    const ctrl = animate(0, NB_CONTRAINTES, {
      duration: 2.0,
      ease: 'easeOut',
      onUpdate: (v) => setContraintes(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [phase, reduced]);

  const placed          = phase !== 'draw';
  const conflictVisible = ['conflict', 'resolve', 'stamp', 'fade'].includes(phase);
  const conflictPos     = phase === 'conflict' ? CONFLIT.from : CONFLIT.to;
  const inConflict      = phase === 'conflict';
  const stamped         = ['stamp', 'fade'].includes(phase);

  const JOURNAL = {
    draw:     { dot: 'bg-warning', text: 'lecture des demandes départementales…' },
    place:    { dot: 'bg-warning', text: `placement · ${contraintes.toLocaleString('fr-FR')} contraintes satisfaites` },
    conflict: { dot: 'bg-danger',  text: 'conflit détecté — jeudi 10h · Salle F' },
    resolve:  { dot: 'bg-info',    text: 'réaffectation : ANG 202 → mercredi 13h' },
    stamp:    { dot: 'bg-success', text: 'solution optimale — 0 conflit' },
    fade:     { dot: 'bg-success', text: 'solution optimale — 0 conflit' },
  };
  const journal = JOURNAL[phase];

  return (
    <div
      className="relative"
      role="img"
      aria-label="Démonstration animée : le solveur lit les demandes, place les séances de la semaine
        dans la grille officielle, détecte un conflit le jeudi à 10 heures, le résout automatiquement,
        puis scelle l'emploi du temps du tampon « sans conflit »."
    >
      {/* Halo bleu doux derrière le document */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-[2rem] bg-primary-500/10 blur-2xl pointer-events-none"
      />

      {/* Le document */}
      <div
        aria-hidden="true"
        className="relative rounded-2xl border border-primary-100 dark:border-line-dark bg-white dark:bg-surface-dark shadow-card-lg overflow-hidden"
      >
        {/* En-tête : bandeau clair avec semaine + sélecteur */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-primary-100 dark:border-line-dark bg-primary-50/50 dark:bg-primary-900/20">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-primary-700 dark:text-primary-300 uppercase truncate">
              Semaine en cours
            </p>
            <p className="font-mono text-[8px] tracking-[0.12em] text-ink-subtle dark:text-ink-dark-subtle uppercase mt-0.5 truncate">
              Du 29 juin au 4 juillet 2026
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary-200 dark:border-primary-400/30 bg-white dark:bg-surface-dark-subtle">
            <span className="font-mono text-[9px] font-semibold tracking-[0.1em] text-primary-800 dark:text-primary-200">S24 · 2025</span>
            <ChevronDown size={11} className="text-primary-500" aria-hidden="true" />
          </span>
        </div>

        {/* Grille : cases + séances (fondu commun en fin de boucle) */}
        <motion.div
          key={cycle}
          animate={{ opacity: phase === 'fade' ? 0 : 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative p-3 sm:p-3.5"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: '34px repeat(6, minmax(0, 1fr))',
              gridTemplateRows: '22px repeat(4, 52px)',
              gap: 3,
            }}
          >
            {/* En-têtes des jours */}
            {DAYS.map((day, i) => (
              <div
                key={day}
                style={{ gridColumn: i + 2, gridRow: 1 }}
                className="flex items-center justify-center font-mono text-[9px] font-semibold tracking-[0.14em] text-ink-muted dark:text-ink-dark-muted"
              >
                {day}
              </div>
            ))}

            {/* Heures des créneaux */}
            {SLOTS.map((slot, i) => (
              <div
                key={slot}
                style={{ gridColumn: 1, gridRow: i + 2 }}
                className="flex items-start justify-end pr-1.5 pt-0.5 font-mono text-[8px] text-ink-subtle dark:text-ink-dark-subtle"
              >
                {slot}
              </div>
            ))}

            {/* Cases vides */}
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={`cell-${i}`}
                style={{ gridColumn: (i % 6) + 2, gridRow: Math.floor(i / 6) + 2 }}
                className="rounded-[5px] bg-primary-50/40 dark:bg-surface-dark-subtle border border-primary-100/70 dark:border-line-dark/60"
              />
            ))}

            {/* Séances placées par le solveur */}
            {SEANCES.map((sc, idx) => (
              <motion.div
                key={sc.code + sc.d + sc.s}
                style={{ gridColumn: sc.d + 2, gridRow: sc.s + 2, zIndex: 2 }}
                initial={false}
                animate={placed
                  ? { opacity: 1, scale: 1, transition: { delay: idx * 0.1, duration: 0.34, ease: easeOut } }
                  : { opacity: 0, scale: 0.55 }}
                className={`m-[1px] rounded-[6px] border px-1 sm:px-1.5 py-1 flex flex-col justify-center gap-[1px] overflow-hidden ${TONES[sc.tone]}`}
              >
                <span className="font-mono text-[7.5px] sm:text-[9px] font-semibold tracking-tight leading-none truncate">
                  {sc.code}
                </span>
                <span className="font-mono text-[6.5px] sm:text-[7.5px] leading-none opacity-70 truncate">
                  {sc.salle}
                </span>
              </motion.div>
            ))}

            {/* La séance en conflit — fiche posée de travers, puis réaffectée */}
            <motion.div
              layout
              style={{ gridColumn: conflictPos.d + 2, gridRow: conflictPos.s + 2, zIndex: 5 }}
              initial={false}
              animate={{
                opacity: conflictVisible ? 1 : 0,
                scale: conflictVisible ? 1 : 0.45,
                rotate: inConflict ? -4 : 0,
                x: inConflict ? 6 : 0,
                y: inConflict ? 5 : 0,
              }}
              transition={{
                layout: { type: 'spring', stiffness: 240, damping: 26 },
                duration: 0.32,
                ease: easeOut,
              }}
              className={
                'relative m-[1px] rounded-[6px] border px-1 sm:px-1.5 py-1 flex flex-col justify-center gap-[1px] overflow-visible shadow-card-md ' +
                (inConflict
                  ? 'bg-danger/5 border-danger text-danger dark:bg-danger/15 dark:text-red-300'
                  : TONES.navy)
              }
            >
              <span className="font-mono text-[7.5px] sm:text-[9px] font-semibold tracking-tight leading-none truncate">
                {CONFLIT.code}
              </span>
              <span className="font-mono text-[6.5px] sm:text-[7.5px] leading-none opacity-70 truncate">
                {CONFLIT.salle}
              </span>
              <span
                className={
                  'absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-danger text-white ' +
                  'flex items-center justify-center text-[8px] font-bold leading-none ' +
                  'transition-transform duration-200 ease-out ' +
                  (inConflict ? 'scale-100' : 'scale-0')
                }
              >
                !
              </span>
            </motion.div>
          </div>

          {/* Balayage de lecture : colonne de lumière bleue qui traverse la grille */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            initial={{ backgroundPosition: '-40% 0' }}
            animate={{ backgroundPosition: phase === 'place' ? '140% 0' : '-40% 0' }}
            transition={phase === 'place' ? { duration: 2.0, ease: 'linear' } : { duration: 0 }}
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(20,56,148,0.12), transparent)',
              backgroundSize: '34% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Tampon « SANS CONFLIT AUTOMATISÉ » — bordure ambre, léger rebond */}
          <div
            className={
              'absolute right-3.5 bottom-3 rounded-md border-2 border-gold-400 px-2.5 py-1.5 ' +
              'text-gold-600 dark:text-gold-300 dark:border-gold-400 bg-white/80 dark:bg-transparent ' +
              'pointer-events-none select-none ' +
              (stamped
                ? 'opacity-100 scale-100 -rotate-[7deg] transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]'
                : 'opacity-0 scale-[1.55] -rotate-[18deg] transition-[transform,opacity] duration-150 ease-out')
            }
          >
            <p className="font-mono text-[9px] font-semibold tracking-[0.16em] leading-tight">SANS CONFLIT</p>
            <p className="font-mono text-[6.5px] tracking-[0.14em] opacity-80 leading-tight mt-0.5 text-center">AUTOMATISÉ</p>
          </div>
        </motion.div>

        {/* Pied : légende + journal du solveur */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 border-t border-primary-100 dark:border-line-dark bg-primary-50/40 dark:bg-surface-dark-subtle/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[3px] bg-primary-500" aria-hidden="true" />
            <span className="font-mono text-[8px] tracking-[0.08em] uppercase text-ink-muted dark:text-ink-dark-muted">Programmé</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[3px] bg-gold-400" aria-hidden="true" />
            <span className="font-mono text-[8px] tracking-[0.08em] uppercase text-ink-muted dark:text-ink-dark-muted">En attente</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[3px] bg-danger" aria-hidden="true" />
            <span className="font-mono text-[8px] tracking-[0.08em] uppercase text-ink-muted dark:text-ink-dark-muted">À vérifier</span>
          </span>
          <span className="inline-flex items-center gap-1.5 ml-auto min-w-0">
            <span className={`pulse-dot ${journal.dot}`} />
            <motion.span
              key={phase === 'place' ? 'place' : journal.text}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="font-mono text-[8.5px] text-primary-700 dark:text-primary-300 truncate tabular"
            >
              {journal.text}
            </motion.span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Bande de statistiques (fond bleu plein) ────────────────────────── */

const STATS = [
  { valeur: 6,  label: 'Semaines planifiées', detail: 'dans le système',  icone: CalendarDays },
  { valeur: 6,  label: 'Départements',        detail: 'de la faculté',    icone: Building2 },
  { valeur: 43, label: 'Enseignants',         detail: 'corps enseignant', icone: Users },
  { valeur: 28, label: 'Salles',              detail: 'répertoriées',     icone: DoorOpen },
];

/* ─── Le circuit ─────────────────────────────────────────────────────── */

const ETAPES = [
  {
    numero: '1',
    icone: Upload,
    titre: 'Les départements soumettent',
    texte: "Chaque département dépose ses UE, ses enseignants et ses contraintes hebdomadaires — cours magistraux, TD et TP.",
  },
  {
    numero: '2',
    icone: Cpu,
    titre: 'La DAASR compose',
    texte: "Le calendrier centralisé place chaque séance, salle et créneau sans conflits, grâce au moteur automatique et à la gestion des priorités.",
  },
  {
    numero: '3',
    icone: Send,
    titre: 'La faculté reçoit',
    texte: "Le planning à la Direction et l'affichage PDF officiel sont générés. Chacun consulte son horaire en temps réel.",
  },
];

/* ─── Manifeste ──────────────────────────────────────────────────────── */

const MANIFESTE = [
  { t: 'Là' }, { t: 'où' }, { t: 'tout' }, { t: 'semble' }, { t: 'impossible' },
  { t: 'à' }, { t: 'concilier,' }, { t: 'ChronoFS' }, { t: 'arbitre' }, { t: 'et' },
  { t: 'résout' }, { t: 'chaque' }, { t: 'conflit' }, { t: 'de' }, { t: 'lui-même.' },
  { t: 'Automatiquement,', hl: true }, { t: 'du', hl: true }, { t: 'premier', hl: true },
  { t: 'au', hl: true }, { t: 'dernier', hl: true }, { t: 'créneau.', hl: true },
];

function Manifeste() {
  const reduced = useReducedMotion();
  return (
    <p className="heading-display text-white text-[1.7rem] sm:text-[2.2rem] lg:text-[2.55rem] leading-[1.3] italic max-w-4xl mx-auto">
      {MANIFESTE.map((mot, i) => (
        <motion.span
          key={`${mot.t}-${i}`}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.04, ease: easeOut }}
          className={'inline-block ' + (mot.hl ? 'text-primary-200' : '')}
        >
          {mot.t}
          {i < MANIFESTE.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
}

/* ─── Capacités ──────────────────────────────────────────────────────── */

/* Séances qui défilent dans la carte « planning en direct ». */
const SEANCES_POOL = [
  { code: 'INF 111', slot: 'LUN 08:00 – 10:00', salle: 'Salle A' },
  { code: 'SMB 111', slot: 'LUN 10:00 – 12:00', salle: 'Salle B' },
  { code: 'MAT 201', slot: 'MAR 09:00 – 11:00', salle: 'Salle C' },
  { code: 'PHY 201', slot: 'MAR 14:00 – 16:00', salle: 'Salle D' },
  { code: 'BIO 100', slot: 'MER 08:00 – 10:00', salle: 'Salle E' },
  { code: 'CHM 210', slot: 'MER 13:00 – 15:00', salle: 'Salle F' },
  { code: 'STA 301', slot: 'JEU 10:00 – 12:00', salle: 'Salle B' },
  { code: 'GEO 120', slot: 'VEN 14:00 – 16:00', salle: 'Salle A' },
];

const CAPACITES = [
  {
    icone: Database,
    titre: 'Référentiel académique',
    texte: 'Gardez filières, départements, UE, enseignants et salles synchronisés et à jour, année académique après année.',
  },
  {
    icone: FileSpreadsheet,
    titre: 'Imports Excel guidés',
    texte: 'Importez rapidement vos besoins depuis Excel. ChronoFS vérifie la cohérence ligne à ligne et vous guide.',
  },
  {
    icone: FileText,
    titre: 'Documents officiels',
    texte: "Générez automatiquement les PDF, Excel et Word officiels, prêts pour l'affichage et l'archivage.",
  },
  {
    icone: History,
    titre: 'Historique et archives',
    texte: 'Gardez une trace de toutes les semaines et consultez les versions précédentes en un clic.',
  },
  {
    icone: MonitorSmartphone,
    titre: 'Consultations en ligne',
    texte: 'Enseignants, départements et étudiants consultent leurs horaires en temps réel, sur mobile comme sur ordinateur.',
  },
];

/* Atouts affichés dans le bandeau CTA final. */
const CTA_POINTS = [
  { icone: CalendarClock, t1: 'Planification rapide', t2: 'en quelques minutes' },
  { icone: ShieldCheck,   t1: 'Zéro conflit',         t2: 'grâce au solveur' },
  { icone: Lock,          t1: 'Accès sécurisé',       t2: 'et traçabilité complète' },
];

/* Carte capacité générique. `featured` = pastille bleu plein (la vedette Solveur). */
function CarteCapacite({ icone: Icone, titre, texte, featured = false, delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <Reveal delay={delay} className="h-full">
      <motion.article
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="group relative h-full overflow-hidden rounded-2xl border border-primary-100 dark:border-line-dark
          bg-white dark:bg-surface-dark p-6 sm:p-7 shadow-card hover:shadow-card-lg transition-shadow duration-300"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 bottom-0 h-[3px] w-0 bg-primary-500 group-hover:w-full transition-all duration-500 ease-out pointer-events-none"
        />

        {featured ? (
          <span className="relative inline-flex w-12 h-12 rounded-xl items-center justify-center bg-primary-900 text-white">
            <Icone size={19} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : (
          <span className="relative inline-flex w-12 h-12 rounded-xl items-center justify-center overflow-hidden bg-primary-50 dark:bg-primary-900/40">
            <span aria-hidden="true" className="absolute inset-0 bg-primary-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Icone size={19} strokeWidth={1.75} className="relative text-primary-700 dark:text-primary-200 group-hover:text-white transition-colors duration-300" aria-hidden="true" />
          </span>
        )}

        <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong">
          {titre}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
          {texte}
        </p>
      </motion.article>
    </Reveal>
  );
}

/* Carte « planning en direct » — fond uniforme aux autres, séances qui défilent
   en boucle (chaque ligne change toutes les 1,5 s avec un léger fondu). */
function CartePlanning({ delay = 0 }) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <Reveal delay={delay} className="h-full">
      <motion.div
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="group relative h-full flex flex-col justify-center overflow-hidden rounded-2xl border border-primary-100 dark:border-line-dark
          bg-white dark:bg-surface-dark p-6 sm:p-7 shadow-card hover:shadow-card-lg transition-shadow duration-300"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 bottom-0 h-[3px] w-0 bg-primary-500 group-hover:w-full transition-all duration-500 ease-out pointer-events-none"
        />
        <ul className="space-y-3.5">
          {[0, 1, 2].map((i) => {
            const seance = SEANCES_POOL[(tick + i) % SEANCES_POOL.length];
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-gold-400/20 border border-gold-500/50 flex items-center justify-center shrink-0">
                  <Check size={11} strokeWidth={3} className="text-gold-600 dark:text-gold-300" aria-hidden="true" />
                </span>
                <span className="relative min-w-0 flex-1 overflow-hidden">
                  <motion.span
                    key={tick}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: easeOut, delay: reduced ? 0 : i * 0.07 }}
                    className="block"
                  >
                    <span className="block font-mono text-[11px] font-semibold tracking-tight text-primary-800 dark:text-primary-200 leading-tight">
                      {seance.code}
                    </span>
                    <span className="block font-mono text-[9px] tracking-tight text-ink-subtle dark:text-ink-dark-subtle leading-tight truncate">
                      {seance.slot} · {seance.salle}
                    </span>
                  </motion.span>
                </span>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </Reveal>
  );
}

/* ─── Questions fréquentes ───────────────────────────────────────────── */

const QUESTIONS = [
  {
    q: 'Qui peut se connecter à ChronoFS ?',
    r: "La Division des affaires académiques (DAASR) et les chefs de département. Les enseignants et étudiants ont un accès en lecture pour consulter leur emploi du temps. Il n'y a pas d'inscription libre.",
  },
  {
    q: 'Mon département travaille déjà sur des maquettes Excel. Faut-il tout ressaisir ?',
    r: "Non. ChronoFS importe vos fichiers Excel tels quels, vérifie chaque ligne (UE, enseignants, demandes hebdomadaires) et signale précisément celles à corriger avant validation.",
  },
  {
    q: 'Que se passe-t-il si deux cours réclament la même salle ?',
    r: "Le solveur ne laisse jamais passer la collision : il réaffecte l'une des séances sur un autre créneau ou une autre salle, et le document final est garanti sans conflit. En cas d'ajustement manuel, la grille signale immédiatement tout chevauchement.",
  },
  {
    q: 'Les emplois du temps restent-ils consultables sans connexion ?',
    r: "Oui. ChronoFS est une application installable (PWA) : les plannings déjà consultés restent lisibles hors ligne, sur mobile comme sur ordinateur.",
  },
  {
    q: 'Sous quels formats les documents sont-ils diffusés ?',
    r: "Excel, PDF et Word, aux gabarits officiels de la faculté — prêts pour la signature, l'affichage et l'archivage. Chaque envoi aux départements est horodaté et tracé.",
  },
];

function QuestionItem({ item, index, ouverte, onToggle }) {
  const reduced = useReducedMotion();
  const panelId = `faq-panel-${index}`;
  const btnId   = `faq-btn-${index}`;

  return (
    <div
      className={
        'rounded-xl border transition-colors duration-200 ' +
        (ouverte
          ? 'border-primary-200 bg-primary-50/70 dark:border-primary-400/30 dark:bg-primary-900/20'
          : 'border-primary-100 bg-white hover:border-primary-200 hover:bg-primary-50/40 dark:border-line-dark dark:bg-surface-dark dark:hover:border-primary-400/25')
      }
    >
      <h3>
        <button
          id={btnId}
          type="button"
          aria-expanded={ouverte}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer
            rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-inset"
        >
          <span className="flex items-center gap-3 min-w-0">
            <ChevronRight
              size={15}
              className="shrink-0 text-primary-400 dark:text-primary-300 group-hover:text-primary-600 dark:group-hover:text-primary-200 transition-colors"
              aria-hidden="true"
            />
            <span className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong group-hover:text-primary-700 dark:group-hover:text-primary-100 transition-colors">
              {item.q}
            </span>
          </span>
          <motion.span
            animate={{ rotate: ouverte ? 180 : 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: easeOut }}
            className="shrink-0 text-primary-400 dark:text-ink-dark-muted group-hover:text-primary-600 dark:group-hover:text-primary-200 transition-colors"
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {ouverte && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={btnId}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="overflow-hidden"
          >
            <p className="pb-4 pt-0 pl-[42px] pr-8 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
              {item.r}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Navigation principale ──────────────────────────────────────────── */

const NAV = [
  { id: 'top',       label: 'Accueil' },
  { id: 'circuit',   label: 'Le circuit' },
  { id: 'capacites', label: 'Capacités' },
  { id: 'questions', label: 'Questions' },
];

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function Landing() {
  const reduced = useReducedMotion();
  const token = useAuthStore((s) => s.token);
  const cta = token
    ? { to: '/', label: 'Ouvrir mon espace' }
    : { to: '/login', label: 'Se connecter' };
  const year = new Date().getFullYear();
  const [questionOuverte, setQuestionOuverte] = useState(-1);

  // La landing publique reproduit une maquette CLAIRE : on force le thème clair
  // le temps de l'afficher (peu importe le thème système/app), puis on restaure
  // le thème précédent quand l'utilisateur quitte la landing (ex. connexion).
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => {
      if (wasDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  const HERO_POINTS = ['Sans conflit', 'Facile à utiliser', 'Gain de temps'];

  return (
    <div id="top" className="min-h-dvh bg-white dark:bg-page-dark text-ink dark:text-ink-dark font-sans">
      {/* Lien d'évitement clavier */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3
          focus:bg-primary-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
      >
        Aller au contenu
      </a>

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 bg-primary-50/80 dark:bg-page-dark/90 backdrop-blur-md border-b border-primary-100 dark:border-line-dark">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoFs}
              alt="Logo de la Faculté des Sciences"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-primary-100 dark:ring-line-dark shrink-0"
            />
            <div className="min-w-0 leading-none">
              <span className="block font-bold tracking-tight text-ink-strong dark:text-ink-dark-strong">
                Chrono<span className="text-primary-600 dark:text-primary-300">FS</span>
              </span>
              <span className="block mt-1 font-mono text-[9px] tracking-[0.16em] uppercase text-ink-subtle dark:text-ink-dark-subtle">
                Faculté des Sciences
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-7" aria-label="Navigation principale">
            {NAV.map((lien, i) => (
              <a
                key={lien.id}
                href={`#${lien.id}`}
                onClick={smoothTo(lien.id)}
                className={
                  'hidden md:inline text-sm transition-colors ' +
                  (i === 0
                    ? 'text-primary-700 dark:text-primary-300 font-semibold'
                    : 'text-ink-muted hover:text-primary-700 dark:text-ink-dark-muted dark:hover:text-primary-200')
                }
              >
                {lien.label}
              </a>
            ))}
            <Link
              to={cta.to}
              className="group inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg text-sm font-semibold
                bg-primary-900 text-white hover:bg-primary-800 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
                dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {cta.label}
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenu">
        {/* ── Héros ── */}
        <section className="relative overflow-hidden bg-primary-50 dark:bg-gradient-to-b dark:from-page-dark dark:via-page-dark dark:to-surface-dark-subtle">
          {/* Filigranes bleus flous */}
          <div aria-hidden="true" className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-primary-200/40 dark:bg-primary-500/10 blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute top-40 -left-32 w-[360px] h-[360px] rounded-full bg-primary-100/60 dark:bg-primary-900/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Colonne texte */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.05, ease: easeOut }}
                  className="heading-display text-ink-strong dark:text-ink-dark-strong
                    text-[2.6rem] leading-[1.04] sm:text-[3rem] lg:text-[3.7rem]"
                >
                  La semaine de toute une faculté,{' '}
                  <span className="text-primary-600 dark:text-primary-300 italic font-medium">composée sans conflit</span>.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16, ease: easeOut }}
                  className="mt-6 text-[15px] sm:text-base leading-relaxed text-ink-muted dark:text-ink-dark-muted max-w-lg"
                >
                  ChronoFS simplifie la planification des emplois du temps à l'échelle
                  des départements, des enseignants et des salles.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.26, ease: easeOut }}
                  className="mt-9 flex flex-wrap items-center gap-3"
                >
                  <BtnPrimary to={cta.to}>{cta.label}</BtnPrimary>
                  <BtnGhost href="#circuit" onClick={smoothTo('circuit')}>Voir le circuit</BtnGhost>
                </motion.div>

                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.42 }}
                  className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2"
                >
                  {HERO_POINTS.map((point) => (
                    <li key={point} className="inline-flex items-center gap-2 text-sm text-ink-muted dark:text-ink-dark-muted">
                      <CheckCircle2 size={17} className="text-primary-600 dark:text-primary-300" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </motion.ul>
              </div>

              {/* Colonne document vivant */}
              <motion.div
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
                className="w-full max-w-[540px] md:max-w-none mx-auto"
              >
                <GrilleVivante />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Bande de statistiques (fond bleu plein) ── */}
        <section aria-label="ChronoFS en chiffres" className="relative overflow-hidden bg-primary-900">
          <div aria-hidden="true" className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-white/[0.04] pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-primary-400/[0.12] pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat, i) => {
                const Icone = stat.icone;
                return (
                  <Reveal
                    key={stat.label}
                    delay={i * 0.08}
                    className={
                      'h-full px-5 sm:px-8 py-10 md:py-14 ' +
                      (i > 0 ? 'lg:border-l border-white/10 ' : '') +
                      (i % 2 === 1 ? 'border-l border-white/10 lg:border-l ' : '') +
                      (i >= 2 ? 'border-t border-white/10 lg:border-t-0 ' : '')
                    }
                  >
                    <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                      <Icone size={18} strokeWidth={1.9} className="text-[#DCE7FF]" aria-hidden="true" />
                    </span>
                    <p className="num mt-5 text-[2.8rem] sm:text-5xl font-semibold leading-none text-white">
                      <Compteur valeur={stat.valeur} />
                    </p>
                    <p className="mt-3 text-sm font-semibold tracking-tight text-white">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xs text-primary-200/80">
                      {stat.detail}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Le circuit ── */}
        <section id="circuit" className="scroll-mt-20 bg-white dark:bg-page-dark">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
            <Reveal className="max-w-2xl">
              <Eyebrow>Le circuit</Eyebrow>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-4 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Du département à l'affichage <span className="text-primary-600 dark:text-primary-300 italic font-medium">officiel</span>.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                Trois étapes simples pour transformer les besoins de chaque département
                en un planning global cohérent et sans conflit.
              </p>
            </Reveal>

            {/* Rangée d'icônes reliées par un connecteur pointillé */}
            <div className="relative mt-14 md:mt-16">
              <div className="grid md:grid-cols-3 gap-10 md:gap-8">
                {ETAPES.map((etape, i) => {
                  const Icone = etape.icone;
                  return (
                    <Reveal key={etape.numero} delay={i * 0.14} className="h-full">
                      <article className="relative h-full flex flex-col">
                        {/* Connecteur pointillé animé vers l'étape suivante */}
                        {i < ETAPES.length - 1 && (
                          <div
                            aria-hidden="true"
                            className="hidden md:block absolute top-7 left-[calc(50%+34px)] right-[calc(-50%+6px)] h-[3px]
                              -translate-y-1/2 rounded-full overflow-hidden"
                          >
                            <motion.div
                              className="h-full w-full"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              viewport={{ once: true, margin: '-80px' }}
                              animate={reduced ? undefined : { backgroundPosition: ['0px 0px', '22px 0px'] }}
                              transition={{
                                opacity: { delay: 0.35 + i * 0.25, duration: 0.5 },
                                backgroundPosition: { duration: 1.15, repeat: Infinity, ease: 'linear' },
                              }}
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(90deg, #D5DEEF 0 9px, transparent 9px 22px)',
                              }}
                            />
                          </div>
                        )}

                        {/* Nœud : pastille bleue centrée, badge numéro ambre */}
                        <div className="relative z-10 flex justify-center">
                          <motion.span
                            initial={{ scale: 0.4, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ delay: 0.15 + i * 0.25, type: 'spring', stiffness: 260, damping: 17 }}
                            className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white
                              ring-4 ring-white dark:ring-page-dark bg-primary-900 shadow-card-md"
                          >
                            <Icone size={20} strokeWidth={1.8} aria-hidden="true" />
                            <span
                              className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-gold-400
                                text-primary-950 font-mono text-[10px] font-bold flex items-center justify-center"
                              aria-hidden="true"
                            >
                              {etape.numero}
                            </span>
                          </motion.span>
                        </div>

                        {/* Corps de l'étape */}
                        <motion.div
                          whileHover={reduced ? undefined : { y: -6 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                          className="mt-5 flex-1 flex flex-col rounded-2xl border border-primary-100 dark:border-line-dark
                            bg-white dark:bg-surface-dark p-6 text-center
                            shadow-card hover:shadow-card-md transition-shadow duration-300"
                        >
                          <h3 className="heading-display text-[1.5rem] leading-tight text-ink-strong dark:text-ink-dark-strong">
                            {etape.titre}
                          </h3>
                          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                            {etape.texte}
                          </p>
                        </motion.div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Manifeste : respiration bleue au milieu du parcours ── */}
        <section aria-label="Pourquoi un solveur" className="relative overflow-hidden bg-primary-900">
          <div aria-hidden="true" className="absolute -top-28 -left-24 w-[380px] h-[340px] rounded-full bg-white/[0.04] pointer-events-none" />
          <motion.div
            aria-hidden="true"
            animate={reduced ? undefined : { scale: [1, 1.1, 1], opacity: [0.1, 0.18, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-primary-400/[0.14] pointer-events-none"
          />

          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 py-20 md:py-28 text-center">
            <span aria-hidden="true" className="block font-display text-6xl sm:text-7xl leading-none text-primary-300/60 select-none">“</span>
            <div className="mt-2">
              <Manifeste />
            </div>
            <Reveal delay={0.25}>
              <p className="mt-9 font-mono text-[10px] tracking-[0.2em] uppercase text-primary-200/60">
                Division des affaires académiques — FS-UEB
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Capacités ── */}
        <section
          id="capacites"
          className="scroll-mt-20 relative overflow-hidden bg-gradient-to-b from-white to-primary-50/50 dark:from-page-dark dark:to-surface-dark-subtle/40 border-y border-primary-100 dark:border-line-dark"
        >
          <div aria-hidden="true" className="absolute top-16 right-14 w-40 h-40 rounded-full border-[1.5px] border-primary-200/50 dark:border-primary-400/10 pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-primary-200/30 dark:bg-primary-900/20 blur-2xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
            <Reveal className="max-w-xl mx-auto text-center">
              <Eyebrow center>Capacités</Eyebrow>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-4 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Ce que ChronoFS tient <span className="text-primary-600 dark:text-primary-300 italic font-medium">à votre place</span>.
              </h2>
            </Reveal>

            <div className="mt-12 md:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CarteCapacite
                icone={Cpu}
                titre="Solveur de contraintes"
                texte="Optimisation avancée : respect des préférences enseignantes, des capacités de salles et des contraintes réglementaires."
                featured
                delay={0}
              />
              <CartePlanning delay={0.07} />
              {CAPACITES.map((cap, i) => (
                <CarteCapacite key={cap.titre} {...cap} delay={(i + 2) * 0.07} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Questions ── */}
        <section id="questions" className="scroll-mt-20 bg-white dark:bg-page-dark">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 md:py-28">
            <Reveal className="text-center">
              <Eyebrow center>Questions</Eyebrow>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-4 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Avant de vous <span className="text-primary-600 dark:text-primary-300 italic font-medium">connecter</span>.
              </h2>
            </Reveal>

            <Reveal delay={0.1} className="mt-10 md:mt-14">
              <div className="space-y-3">
                {QUESTIONS.map((item, i) => (
                  <QuestionItem
                    key={item.q}
                    item={item}
                    index={i}
                    ouverte={questionOuverte === i}
                    onToggle={() => setQuestionOuverte(questionOuverte === i ? -1 : i)}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA final : bandeau bleu ── */}
        <section className="bg-white dark:bg-page-dark px-5 sm:px-8 pb-16 md:pb-20">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-primary-900 px-6 py-8 sm:px-10 sm:py-10
                flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                {/* Halos décoratifs */}
                <div aria-hidden="true" className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/[0.05] pointer-events-none" />
                <motion.div
                  aria-hidden="true"
                  animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-primary-400/[0.16] blur-2xl pointer-events-none"
                />

                {/* Gauche : titre + sous-texte */}
                <div className="relative shrink-0 lg:max-w-xs">
                  <h2 className="heading-display text-white text-[1.55rem] sm:text-[1.9rem] leading-[1.14]">
                    Prêt à gagner du temps et à <span className="text-primary-200 italic font-medium">éliminer les conflits</span> ?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    Rejoignez les départements qui planifient déjà leurs semaines en quelques clics.
                  </p>
                </div>

                {/* Centre : 3 atouts */}
                <ul className="relative flex flex-wrap items-start justify-start gap-x-7 gap-y-5 sm:gap-x-9">
                  {CTA_POINTS.map(({ icone: Icone, t1, t2 }) => (
                    <li key={t1} className="flex flex-col items-center text-center gap-2">
                      <span className="inline-flex w-11 h-11 items-center justify-center rounded-full bg-white/10 border border-white/15">
                        <Icone size={18} strokeWidth={1.9} className="text-white" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] leading-snug text-white/70 whitespace-nowrap">
                        <span className="block font-semibold text-white">{t1}</span>
                        {t2}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Droite : boutons */}
                <div className="relative shrink-0 flex flex-col items-stretch sm:items-start gap-3">
                  <Link
                    to={cta.to}
                    className="group inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-xl
                      bg-white text-primary-900 text-sm font-semibold hover:bg-primary-50 active:scale-[0.98]
                      transition-[background-color,transform] duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                  >
                    {cta.label}
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <a
                    href="#circuit"
                    onClick={smoothTo('circuit')}
                    className="group inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-xl
                      border border-white/25 text-white text-sm font-medium hover:bg-white/10 hover:border-white/40 active:scale-[0.98]
                      transition-[background-color,border-color,transform] duration-200 cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                  >
                    Voir le circuit
                    <ArrowUp size={14} className="transition-transform duration-200 group-hover:-translate-y-1" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Pied de page ── */}
      <footer className="relative overflow-hidden bg-primary-950 pt-10 pb-8">
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -right-28 w-[380px] h-[340px] rounded-full bg-primary-400/[0.10] blur-2xl pointer-events-none"
        />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFs} alt="" aria-hidden="true" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/15" />
              <div>
                <p className="font-bold tracking-tight text-white">ChronoFS</p>
                <p className="text-xs text-white/55 mt-0.5">Faculté des Sciences · Université d'État</p>
              </div>
            </div>

            <nav aria-label="Liens de pied de page" className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {NAV.map((lien) => (
                <a
                  key={lien.id}
                  href={`#${lien.id}`}
                  onClick={smoothTo(lien.id)}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {lien.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-7 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/40">
              © {year} ChronoFS · Faculté des Sciences
            </p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10">
              <span className="pulse-dot bg-gold-400" aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-white/60">FS · UEB / DAASR</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
