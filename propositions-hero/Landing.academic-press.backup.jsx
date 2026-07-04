// Landing publique de ChronoFS — direction « Academic Press ».
// Grammaire visuelle de l'application : navy institutionnel plat, accents or
// ponctuels, fonds crème/papier, Cormorant Garamond pour les titres,
// Plus Jakarta Sans pour le corps, JetBrains Mono pour le registre.
// Pièce signature : le dossier officiel vivant — la grille UEB (6 jours ×
// 4 créneaux) que le solveur lit, remplit, corrige puis scelle du tampon
// « SANS CONFLIT ». Tout le reste de la page reste discipliné autour d'elle.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useReducedMotion, useInView, animate,
} from 'framer-motion';
import {
  ArrowRight, ArrowDown, Check, ChevronDown, Cpu, Database,
  FileSpreadsheet, FileText, History, WifiOff, Upload, Send,
  CalendarDays, Clock3, FileOutput, ShieldCheck,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import logoFs from '../assets/logo_fs.png';

/* ─── Constantes de charte ───────────────────────────────────────────── */

const easeOut = [0.22, 1, 0.36, 1];

/* Seul dégradé autorisé par la charte : navy sobre (primary-900 → 800),
   réservé aux grandes surfaces sombres (CTA, filigranes, manifeste). */
const GRAD = 'linear-gradient(150deg, #1E3A8A 0%, #162C56 100%)';

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
      duration: 1.1,
      delay: 0.12,
      ease: easeOut,
      onUpdate: (v) => setAffiche(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [inView, reduced, valeur]);

  return <span ref={ref} className={className}>{affiche}</span>;
}

function BtnPrimary({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={
        'group inline-flex items-center justify-center gap-2 min-h-[46px] px-7 rounded-lg ' +
        'bg-primary-900 text-white text-sm font-semibold tracking-tight ' +
        'hover:bg-primary-800 active:scale-[0.98] transition-[background-color,transform] duration-200 ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ' +
        'focus-visible:ring-offset-2 focus-visible:ring-offset-page ' +
        'dark:bg-gold-400 dark:text-primary-950 dark:hover:bg-gold-300 ' +
        'dark:focus-visible:ring-gold-400/70 dark:focus-visible:ring-offset-page-dark ' + className
      }
    >
      {children}
      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

function BtnGhost({ onClick, href, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-lg
        border border-line-strong text-sm font-semibold text-ink cursor-pointer
        hover:border-primary-700 hover:text-primary-800 active:scale-[0.98]
        transition-[border-color,color,transform] duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
        dark:border-line-dark-strong dark:text-ink-dark
        dark:hover:text-gold-300 dark:hover:border-gold-500/60 dark:focus-visible:ring-gold-400/60"
    >
      {children}
      <ArrowDown size={14} className="transition-transform duration-200 group-hover:translate-y-0.5" aria-hidden="true" />
    </a>
  );
}

/* Bouton navy du CTA final — glow pulsant + balayage lumineux au survol,
   copie fidèle du bouton « Connexion » de la page de connexion. */
function BoutonNavy({ to, children }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="rounded-xl"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={reduced ? undefined : { scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      animate={reduced ? undefined : {
        boxShadow: [
          '0 3px 14px rgba(30,58,138,0.28)',
          '0 3px 14px rgba(30,58,138,0.28), 0 0 22px rgba(30,58,138,0.18)',
          '0 3px 14px rgba(30,58,138,0.28)',
        ],
      }}
      transition={{
        boxShadow: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
        scale: { type: 'spring', stiffness: 420, damping: 22 },
      }}
    >
      <Link
        to={to}
        className="group relative overflow-hidden flex w-full items-center justify-center gap-2 min-h-[48px] px-8
          rounded-xl text-white text-sm font-semibold select-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2"
        style={{ background: '#1E3A8A' }}
      >
        <motion.span
          aria-hidden="true"
          initial={{ x: '-130%' }}
          animate={hovered && !reduced ? { x: ['-130%', '330%'] } : { x: '-130%' }}
          transition={hovered && !reduced ? { duration: 0.65, ease: 'easeInOut' } : { duration: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '42%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)',
            skewX: -12,
          }}
        />
        <span className="relative">{children}</span>
        <ArrowRight size={15} className="relative transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

/* Défilement doux vers une ancre, en respectant reduced-motion. */
const smoothTo = (id) => (e) => {
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};

/* ─── Pièce signature : le dossier officiel vivant ───────────────────────
   Semaine UEB réelle : LUN→SAM, créneaux 07:30 / 10:15 / 13:00 / 15:45.
   Chorégraphie en boucle : lecture → balayage + placement → conflit →
   réaffectation → tampon « SANS CONFLIT » → fondu, puis recommence. */

const SLOTS = ['07:30', '10:15', '13:00', '15:45'];
const DAYS  = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

const SEANCES = [
  { code: 'INF 231', salle: 'Amphi 250', d: 0, s: 0, tone: 'navy' },
  { code: 'MAT 211', salle: 'S.104',     d: 0, s: 2, tone: 'navy' },
  { code: 'PHY 221', salle: 'Amphi 150', d: 1, s: 1, tone: 'navy' },
  { code: 'INF 243', salle: 'Lab B',     d: 1, s: 3, tone: 'gold' },
  { code: 'INF 235', salle: 'S.201',     d: 2, s: 0, tone: 'navy' },
  { code: 'BIO 201', salle: 'Amphi 250', d: 3, s: 1, tone: 'navy' },
  { code: 'MAT 213', salle: 'S.104',     d: 4, s: 0, tone: 'gold' },
  { code: 'INF 231', salle: 'S.108',     d: 4, s: 2, tone: 'gold' },
  { code: 'CHM 205', salle: 'Lab A',     d: 5, s: 0, tone: 'navy' },
];

const CONFLIT = {
  code: 'ANG 202', salle: 'Amphi 150',
  from: { d: 3, s: 1 },   // se pose sur la case de BIO 201 (jeudi 10:15)
  to:   { d: 3, s: 3 },   // réaffecté jeudi 15:45
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

  /* Le compteur de contraintes monte pendant le placement, comme un vrai
     journal de solveur qui égrène son travail. */
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
    conflict: { dot: 'bg-danger',  text: 'conflit détecté — jeudi 10:15 · Amphi 150' },
    resolve:  { dot: 'bg-info',    text: 'réaffectation : ANG 202 → jeudi 15:45' },
    stamp:    { dot: 'bg-success', text: 'solution optimale — 0 conflit' },
    fade:     { dot: 'bg-success', text: 'solution optimale — 0 conflit' },
  };
  const journal = JOURNAL[phase];

  return (
    <div
      className="relative"
      role="img"
      aria-label="Démonstration animée : le solveur lit les demandes, place les séances de la semaine
        dans la grille officielle, détecte un conflit le jeudi à 10h15, le résout automatiquement,
        puis scelle l'emploi du temps du tampon « sans conflit »."
    >
      {/* Chemise cartonnée : cadre or décalé derrière le document */}
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border border-gold-300/50 dark:border-gold-500/25"
      />

      {/* Le document officiel */}
      <div
        aria-hidden="true"
        className="relative rounded-xl border border-line dark:border-line-dark bg-white dark:bg-surface-dark shadow-card-lg overflow-hidden"
      >
        {/* En-tête : cartouche administratif sous filet double */}
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2.5 border-b-[3px] border-double border-line-strong dark:border-line-dark-strong">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold tracking-[0.22em] text-ink-muted dark:text-ink-dark-muted uppercase truncate">
              Emploi du temps · L2 Informatique
            </p>
            <p className="font-mono text-[8px] tracking-[0.18em] text-ink-subtle dark:text-ink-dark-subtle uppercase mt-0.5 truncate">
              Faculté des Sciences — UEB
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[9px] font-semibold tracking-[0.14em] text-gold-600 dark:text-gold-300">
              SEM. 24
            </p>
            <p className="font-mono text-[7px] tracking-[0.14em] text-ink-subtle dark:text-ink-dark-subtle mt-0.5">
              RÉF. FS/DAR/S24
            </p>
          </div>
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
              gridTemplateColumns: '38px repeat(6, minmax(0, 1fr))',
              gridTemplateRows: '22px repeat(4, 54px)',
              gap: 3,
            }}
          >
            {/* En-têtes des jours */}
            {DAYS.map((day, i) => (
              <div
                key={day}
                style={{ gridColumn: i + 2, gridRow: 1 }}
                className="flex items-center justify-center font-mono text-[9px] font-semibold tracking-[0.16em] text-ink-muted dark:text-ink-dark-muted"
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
                className="rounded-[4px] bg-surface-subtle dark:bg-surface-dark-subtle border border-line/50 dark:border-line-dark/60"
              />
            ))}

            {/* Séances placées par le solveur */}
            {SEANCES.map((sc, idx) => (
              <motion.div
                key={sc.code + sc.d + sc.s}
                style={{ gridColumn: sc.d + 2, gridRow: sc.s + 2, zIndex: 2 }}
                initial={false}
                animate={placed
                  ? { opacity: 1, scale: 1, transition: { delay: idx * 0.12, duration: 0.34, ease: easeOut } }
                  : { opacity: 0, scale: 0.55 }}
                className={`m-[1px] rounded-[5px] border px-1 sm:px-1.5 py-1 flex flex-col justify-center gap-[1px] overflow-hidden ${TONES[sc.tone]}`}
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
                'relative m-[1px] rounded-[5px] border px-1 sm:px-1.5 py-1 flex flex-col justify-center gap-[1px] overflow-visible shadow-card-md ' +
                (inConflict
                  ? 'bg-danger/5 border-danger text-danger dark:bg-danger/15 dark:text-red-300'
                  : TONES.gold)
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

          {/* Balayage de lecture : une colonne de lumière or traverse la grille
              pendant le placement — le solveur « lit » la semaine. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            initial={{ backgroundPosition: '-40% 0' }}
            animate={{ backgroundPosition: phase === 'place' ? '140% 0' : '-40% 0' }}
            transition={phase === 'place' ? { duration: 2.0, ease: 'linear' } : { duration: 0 }}
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.13), transparent)',
              backgroundSize: '34% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Cachet doré — coup de tampon avec léger rebond (courbe back-out),
              neutralisé par prefers-reduced-motion (transitions CSS pures). */}
          <div
            className={
              'absolute right-4 bottom-3 rounded-md border-2 border-gold-500 px-3 py-1.5 ' +
              'text-gold-600 dark:text-gold-300 dark:border-gold-400 ' +
              'mix-blend-multiply dark:mix-blend-normal pointer-events-none select-none ' +
              (stamped
                ? 'opacity-100 scale-100 -rotate-[8deg] transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]'
                : 'opacity-0 scale-[1.55] -rotate-[18deg] transition-[transform,opacity] duration-150 ease-out')
            }
            style={{ boxShadow: 'inset 0 0 0 1px currentColor' }}
          >
            <p className="font-mono text-[10px] font-semibold tracking-[0.2em] leading-tight">SANS CONFLIT</p>
            <p className="font-mono text-[7px] tracking-[0.16em] opacity-80 leading-tight mt-0.5">CP-SAT · OPTIMAL</p>
          </div>
        </motion.div>

        {/* Journal du solveur */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line dark:border-line-dark bg-surface-subtle/70 dark:bg-surface-dark-subtle/70">
          <span className={`pulse-dot ${journal.dot}`} />
          <span className="font-mono text-[9.5px] font-semibold text-gold-600 dark:text-gold-300 shrink-0">
            cp-sat ›
          </span>
          <motion.span
            key={phase === 'place' ? 'place' : journal.text}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="font-mono text-[9.5px] text-ink-muted dark:text-ink-dark-muted truncate tabular"
          >
            {journal.text}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

/* ─── Bande registre : les invariants de la semaine UEB ──────────────── */

const FAITS = [
  { valeur: 6, label: 'Jours par semaine', detail: 'Lundi → Samedi',         icone: CalendarDays },
  { valeur: 4, label: 'Créneaux par jour', detail: '07:30 → 15:45',          icone: Clock3 },
  { valeur: 3, label: 'Formats officiels', detail: 'Excel · PDF · Word',     icone: FileOutput },
  { valeur: 0, label: 'Conflit toléré',    detail: 'Garanti par le solveur', icone: ShieldCheck, hero: true },
];

/* Filets internes de la fiche : 2 colonnes en mobile, 4 en desktop. */
const FILETS = [
  '',
  'border-l border-line dark:border-line-dark',
  'border-t lg:border-t-0 border-line dark:border-line-dark',
  'border-t lg:border-t-0 border-l border-line dark:border-line-dark',
];

/* ─── Le circuit (vraie séquence administrative, d'où la numérotation) ── */

const ETAPES = [
  {
    numero: '01',
    icone: Upload,
    role: 'Chefs de département',
    titre: 'Les départements soumettent',
    texte: "Chaque chef de département dépose ses UE, ses enseignants et ses demandes hebdomadaires — un import Excel contrôlé ligne par ligne.",
    artefact: 'maquette_info.xlsx · 214 lignes contrôlées',
  },
  {
    numero: '02',
    icone: Cpu,
    role: 'DAR',
    titre: 'La DAR compose',
    texte: "Le solveur de contraintes place chaque séance : salles, filières et enseignants sans collision. Les ajustements se font au glisser-déposer.",
    artefact: 'cp-sat · 3 412 contraintes · optimal',
  },
  {
    numero: '03',
    icone: Send,
    role: 'Toute la faculté',
    titre: 'La faculté reçoit',
    texte: "Les emplois du temps partent en Excel, PDF et Word aux gabarits officiels. Chaque envoi est tracé, chaque semaine archivée.",
    artefact: 'EDT_S24.pdf · .xlsx · .docx',
  },
];

/* ─── Manifeste : la phrase en mots, pour la révélation typographique ── */

const MANIFESTE = [
  { t: 'Vingt-huit' }, { t: 'salles,', gold: true }, { t: 'quarante-trois' },
  { t: 'enseignants,', gold: true }, { t: 'six' }, { t: 'jours,', gold: true },
  { t: 'quatre' }, { t: 'créneaux', gold: true }, { t: ':' }, { t: 'plus' },
  { t: 'de' }, { t: 'combinaisons' }, { t: "qu'une" }, { t: 'année' },
  { t: 'de' }, { t: 'réunions' }, { t: 'ne' }, { t: 'peut' }, { t: 'en' },
  { t: 'examiner.' }, { t: 'Le' }, { t: 'solveur' }, { t: 'les' },
  { t: 'examine' }, { t: 'toutes.', gold: true },
];

function Manifeste() {
  const reduced = useReducedMotion();
  return (
    <p className="heading-display text-white text-[1.7rem] sm:text-[2.2rem] lg:text-[2.6rem] leading-[1.25] max-w-4xl mx-auto">
      {MANIFESTE.map((mot, i) => (
        <motion.em
          key={`${mot.t}-${i}`}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.045, ease: easeOut }}
          className={'inline-block not-italic ' + (mot.gold ? 'text-gold-300 italic' : '')}
        >
          {mot.t}
          {i < MANIFESTE.length - 1 ? ' ' : ''}
        </motion.em>
      ))}
    </p>
  );
}

/* ─── Capacités ──────────────────────────────────────────────────────── */

const REGLES_SOLVEUR = [
  'Une salle, une seule séance à la fois',
  'Un enseignant, un seul cours à la fois',
  'Une filière, un seul créneau à la fois',
];

const CAPACITES = [
  {
    icone: Database,
    titre: 'Référentiel académique',
    texte: 'Campus, salles, départements, filières, UE et enseignants tenus dans un registre unique, année académique par année académique.',
  },
  {
    icone: FileSpreadsheet,
    titre: 'Imports Excel guidés',
    texte: 'Les maquettes départementales entrent telles quelles. ChronoFS vérifie chaque ligne et signale ce qui doit être corrigé.',
  },
  {
    icone: FileText,
    titre: 'Documents officiels',
    texte: 'Excel, PDF et Word aux gabarits UEB, prêts pour la signature et l’affichage. Le document tamponné reste la référence.',
  },
  {
    icone: History,
    titre: 'Historique et archives',
    texte: 'Chaque envoi aux départements est tracé, chaque semestre archivé. On retrouve une semaine passée en deux clics.',
  },
  {
    icone: WifiOff,
    titre: 'Consultation hors ligne',
    texte: "Application installable sur mobile et bureau : les plannings restent lisibles même quand le réseau du campus ne suit pas.",
  },
];

/* Carte vedette : le solveur, avec ses règles cochées une à une. */
function CarteSolveur() {
  const reduced = useReducedMotion();
  return (
    <Reveal className="h-full sm:col-span-2">
      <motion.article
        whileHover={reduced ? undefined : { y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="group relative h-full overflow-hidden rounded-2xl border border-line dark:border-line-dark
          bg-white dark:bg-surface-dark p-6 sm:p-7 shadow-card hover:shadow-card-lg transition-shadow duration-300"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/60 dark:group-hover:bg-primary-900/20 transition-colors duration-300 pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute left-0 bottom-0 h-[2px] w-0 bg-gold-400 group-hover:w-full transition-all duration-500 ease-out pointer-events-none"
        />

        <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <span className="relative inline-flex w-12 h-12 rounded-xl items-center justify-center bg-primary-900 text-white">
              <Cpu size={19} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong">
              Solveur de contraintes
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted max-w-md">
              OR-Tools CP-SAT place les séances par calcul, pas par patience.
              Salles, enseignants et filières, tous satisfaits à la fois — et la
              preuve est dans le document.
            </p>
          </div>

          {/* Les règles du solveur, cochées une à une à l'apparition */}
          <ul className="w-full sm:w-64 rounded-xl border border-line dark:border-line-dark bg-surface-subtle dark:bg-surface-dark-subtle p-4 space-y-3">
            {REGLES_SOLVEUR.map((regle, i) => (
              <li key={regle} className="flex items-start gap-2.5">
                <motion.span
                  initial={reduced ? false : { scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: 0.35 + i * 0.3, type: 'spring', stiffness: 380, damping: 18 }}
                  className="mt-px w-4 h-4 rounded-full bg-gold-400/20 border border-gold-500/50 flex items-center justify-center shrink-0"
                >
                  <Check size={10} strokeWidth={3} className="text-gold-600 dark:text-gold-300" aria-hidden="true" />
                </motion.span>
                <span className="font-mono text-[10px] leading-snug tracking-tight text-ink-muted dark:text-ink-dark-muted uppercase">
                  {regle}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </motion.article>
    </Reveal>
  );
}

/* ─── Questions fréquentes ───────────────────────────────────────────── */

const QUESTIONS = [
  {
    q: 'Qui peut se connecter à ChronoFS ?',
    r: "La Division des affaires académiques (DAR) et les chefs de département. Les comptes sont créés et délivrés par la DAR — il n'y a pas d'inscription libre.",
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
    <div className="border-b border-line dark:border-line-dark">
      <h3>
        <button
          id={btnId}
          type="button"
          aria-expanded={ouverte}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-center justify-between gap-4 py-5 text-left cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2
            focus-visible:ring-offset-page dark:focus-visible:ring-gold-400/60 dark:focus-visible:ring-offset-page-dark rounded-sm"
        >
          <span className="flex items-baseline gap-4 min-w-0">
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold-600 dark:text-gold-300 shrink-0">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong group-hover:text-primary-800 dark:group-hover:text-gold-200 transition-colors">
              {item.q}
            </span>
          </span>
          <motion.span
            animate={{ rotate: ouverte ? 180 : 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: easeOut }}
            className="shrink-0 w-8 h-8 rounded-full border border-line dark:border-line-dark flex items-center justify-center
              text-ink-muted dark:text-ink-dark-muted group-hover:border-gold-400/60 group-hover:text-gold-600
              dark:group-hover:text-gold-300 transition-colors"
            aria-hidden="true"
          >
            <ChevronDown size={15} />
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
            <p className="pb-5 pl-[42px] pr-12 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
              {item.r}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function Landing() {
  const reduced = useReducedMotion();
  const token = useAuthStore((s) => s.token);
  const cta = token
    ? { to: '/', label: 'Ouvrir mon espace' }
    : { to: '/login', label: 'Se connecter' };
  const year = new Date().getFullYear();
  const [questionOuverte, setQuestionOuverte] = useState(0);

  return (
    <div className="min-h-dvh bg-page dark:bg-page-dark text-ink dark:text-ink-dark font-sans">
      {/* Lien d'évitement clavier */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3
          focus:bg-primary-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
      >
        Aller au contenu
      </a>

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 bg-page/90 dark:bg-page-dark/90 backdrop-blur-md border-b border-line dark:border-line-dark">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoFs}
              alt="Logo de la Faculté des Sciences"
              className="w-9 h-9 rounded-full object-cover ring-1 ring-line dark:ring-line-dark shrink-0"
            />
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-bold tracking-tight text-ink-strong dark:text-ink-dark-strong">
                Chrono<span className="text-gold-600 dark:text-gold-300">FS</span>
              </span>
              <span className="eyebrow hidden sm:inline border-l border-line dark:border-line-dark pl-3">
                FS · UEB
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-6" aria-label="Navigation principale">
            {[
              { id: 'circuit',   label: 'Le circuit' },
              { id: 'capacites', label: 'Capacités' },
              { id: 'questions', label: 'Questions' },
            ].map((lien) => (
              <a
                key={lien.id}
                href={`#${lien.id}`}
                onClick={smoothTo(lien.id)}
                className="hidden md:inline text-sm text-ink-muted hover:text-ink-strong dark:text-ink-dark-muted dark:hover:text-ink-dark-strong transition-colors"
              >
                {lien.label}
              </a>
            ))}
            <Link
              to={cta.to}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-lg text-sm font-semibold
                bg-primary-900 text-white hover:bg-primary-800 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60
                dark:bg-gold-400 dark:text-primary-950 dark:hover:bg-gold-300"
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenu">
        {/* ── Héros ── */}
        <section className="relative overflow-hidden">
          {/* Papier réglé : trame registre très discrète */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none dark:hidden"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 31px, rgba(15,31,71,0.035) 31px 32px)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none hidden dark:block"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 31px, rgba(255,255,255,0.03) 31px 32px)',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
            {/* Règle de protocole : l'en-tête administratif, comme sur l'arrêté */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="flex items-center gap-4"
            >
              <span aria-hidden="true" className="hidden sm:block flex-1 h-px bg-line-strong dark:bg-line-dark-strong" />
              <p className="font-mono text-[9px] sm:text-[10px] font-semibold tracking-[0.24em] uppercase text-ink-muted dark:text-ink-dark-muted text-center">
                Université d'Ébolowa <span className="text-gold-600 dark:text-gold-300 mx-1">·</span> Faculté
                des Sciences <span className="text-gold-600 dark:text-gold-300 mx-1">·</span> Div. des affaires académiques
              </p>
              <span aria-hidden="true" className="hidden sm:block flex-1 h-px bg-line-strong dark:bg-line-dark-strong" />
            </motion.div>

            <div className="mt-10 md:mt-14 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Colonne texte */}
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease: easeOut }}
                  className="eyebrow flex items-center gap-3"
                >
                  <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
                  Gestion des emplois du temps
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16, ease: easeOut }}
                  className="heading-display text-ink-strong dark:text-ink-dark-strong mt-5
                    text-[2.5rem] leading-[1.05] sm:text-[2.9rem] lg:text-[3.7rem]"
                >
                  La semaine de toute une faculté,{' '}
                  <em className="text-gold-600 dark:text-gold-300">composée sans conflit</em>.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.24, ease: easeOut }}
                  className="mt-6 text-[15px] sm:text-base leading-relaxed text-ink-muted dark:text-ink-dark-muted max-w-lg"
                >
                  Les départements soumettent leurs demandes, le solveur place chaque
                  séance — salles, enseignants, filières — et la faculté diffuse ses
                  documents officiels. Six jours, quatre créneaux, zéro collision.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.32, ease: easeOut }}
                  className="mt-9 flex flex-wrap items-center gap-3"
                >
                  <BtnPrimary to={cta.to}>{cta.label}</BtnPrimary>
                  <BtnGhost href="#circuit" onClick={smoothTo('circuit')}>Voir le circuit</BtnGhost>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-7 font-mono text-[9px] tracking-[0.16em] uppercase text-ink-subtle dark:text-ink-dark-subtle"
                >
                  Accès délivré par la DAR <span className="text-gold-500 mx-1.5" aria-hidden="true">·</span>
                  Installable <span className="text-gold-500 mx-1.5" aria-hidden="true">·</span>
                  Consultable hors ligne
                </motion.p>
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

        {/* ── Bande registre : la fiche technique de la semaine UEB ── */}
        <section
          aria-label="La semaine UEB en chiffres"
          className="relative overflow-hidden bg-surface-subtle dark:bg-surface-dark-subtle border-y border-line dark:border-line-dark"
        >
          {/* Filigranes organiques — écho de la page de connexion */}
          <div
            aria-hidden="true"
            className="absolute -top-44 -right-32 w-[430px] h-[380px] pointer-events-none opacity-[0.06] dark:opacity-[0.12]"
            style={{ background: GRAD, borderRadius: '58% 42% 62% 38% / 48% 55% 45% 52%' }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-24 w-[280px] h-[250px] pointer-events-none opacity-[0.05] dark:opacity-[0.10]"
            style={{ background: GRAD, borderRadius: '62% 38% 42% 58% / 55% 60% 40% 45%' }}
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {FAITS.map((fait, i) => {
                const Icone = fait.icone;
                return (
                  <Reveal key={fait.label} delay={i * 0.08} className={`h-full ${FILETS[i]}`}>
                    <div className="group h-full px-5 sm:px-8 py-10 md:py-14">
                      <span className="relative inline-flex w-10 h-10 items-center justify-center">
                        {fait.hero ? (
                          <>
                            <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-primary-900 dark:bg-gold-400" />
                            {!reduced && (
                              <motion.span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-xl border-2 border-gold-400"
                                animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                              />
                            )}
                            <Icone size={17} strokeWidth={1.9} className="relative text-white dark:text-primary-950" aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-900/40" />
                            <Icone size={17} strokeWidth={1.9} className="relative text-primary-900 dark:text-primary-200" aria-hidden="true" />
                          </>
                        )}
                      </span>

                      <p className="num mt-5 text-[2.6rem] sm:text-5xl font-semibold leading-none">
                        <span className={fait.hero ? 'text-gold-600 dark:text-gold-300' : 'text-primary-900 dark:text-ink-dark-strong'}>
                          <Compteur valeur={fait.valeur} />
                        </span>
                      </p>

                      {/* Filet or : se déploie sous le chiffre à l'apparition */}
                      <motion.span
                        aria-hidden="true"
                        initial={reduced ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.6, delay: 0.35 + i * 0.08, ease: easeOut }}
                        className="block origin-left mt-4 h-px w-10 bg-gold-500/70 dark:bg-gold-400/70"
                      />

                      <p className="mt-3.5 text-sm font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong">
                        {fait.label}
                      </p>
                      <p className="mt-1 font-mono text-[9px] tracking-[0.14em] uppercase text-ink-subtle dark:text-ink-dark-subtle">
                        {fait.detail}
                      </p>
                    </div>
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
              <p className="eyebrow flex items-center gap-3">
                <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
                Le circuit
              </p>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-4 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Du département à l'affichage <em className="text-gold-600 dark:text-gold-300">officiel</em>.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                Trois rôles, un seul document final. ChronoFS suit le circuit administratif
                réel de la faculté — rien à réinventer, tout à accélérer.
              </p>
            </Reveal>

            <div className="mt-12 md:mt-16 grid md:grid-cols-3 gap-10 md:gap-8">
              {ETAPES.map((etape, i) => {
                const Icone = etape.icone;
                return (
                  <Reveal key={etape.numero} delay={i * 0.14} className="h-full">
                    <article className="relative h-full flex flex-col">
                      {/* Connecteur pointillé animé : le flux circule vers l'étape suivante */}
                      {i < ETAPES.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="hidden md:block absolute top-7 left-[calc(50%+36px)] right-[calc(-50%+4px)] h-[3px]
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
                                'repeating-linear-gradient(90deg, rgba(30,58,138,0.32) 0 9px, transparent 9px 22px)',
                            }}
                          />
                        </div>
                      )}

                      {/* Nœud : pastille navy centrée au-dessus de sa carte */}
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
                              text-primary-950 font-mono text-[9px] font-bold flex items-center justify-center"
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
                        className="mt-5 flex-1 flex flex-col rounded-2xl border border-line dark:border-line-dark
                          bg-surface-subtle dark:bg-surface-dark-subtle p-6 text-center
                          shadow-card hover:shadow-card-md transition-shadow duration-300"
                      >
                        <span className="mx-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          bg-white dark:bg-surface-dark border border-line dark:border-line-dark">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                          <span className="font-mono text-[9px] font-semibold tracking-[0.16em] uppercase text-primary-900 dark:text-primary-200">
                            {etape.role}
                          </span>
                        </span>
                        <h3 className="heading-display text-[1.5rem] leading-tight text-ink-strong dark:text-ink-dark-strong mt-3.5">
                          {etape.titre}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                          {etape.texte}
                        </p>
                        {/* L'artefact : la trace concrète que produit l'étape */}
                        <p className="mt-auto pt-5">
                          <span className="inline-block font-mono text-[9px] tracking-[0.1em] text-ink-subtle dark:text-ink-dark-subtle
                            border-t border-dashed border-line-strong dark:border-line-dark-strong pt-2.5">
                            {etape.artefact}
                          </span>
                        </p>
                      </motion.div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Manifeste : la respiration navy au milieu du parcours ── */}
        <section
          aria-label="Pourquoi un solveur"
          className="relative overflow-hidden bg-primary-950"
        >
          {/* Trame registre + filigrane, comme le pied de page */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 31px, rgba(255,255,255,0.025) 31px 32px)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -top-32 -left-28 w-[380px] h-[340px] pointer-events-none opacity-[0.22]"
            style={{ background: GRAD, borderRadius: '58% 42% 62% 38% / 48% 55% 45% 52%' }}
          />
          <motion.div
            aria-hidden="true"
            animate={reduced ? undefined : { scale: [1, 1.1, 1], opacity: [0.1, 0.16, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-gold-400/[0.12] pointer-events-none"
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 text-center">
            <Reveal>
              <p className="rule-ornate max-w-xs mx-auto opacity-90">
                <span aria-hidden="true">✦</span>
              </p>
            </Reveal>
            <div className="mt-8">
              <Manifeste />
            </div>
            <Reveal delay={0.25}>
              <p className="mt-9 font-mono text-[10px] tracking-[0.2em] uppercase text-white/50">
                Division des affaires académiques — FS-UEB
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Capacités ── */}
        <section
          id="capacites"
          className="scroll-mt-20 relative overflow-hidden bg-surface-alt/60 dark:bg-surface-dark-subtle/40 border-b border-line dark:border-line-dark"
        >
          {/* Décor sobre : anneaux or et navy discrets */}
          <div
            aria-hidden="true"
            className="absolute top-16 right-14 w-40 h-40 rounded-full border-[1.5px] border-primary-900/10 dark:border-primary-200/10 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-gold-400/[0.06] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-12 left-12 w-24 h-24 rounded-full border border-gold-400/20 pointer-events-none"
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
            <Reveal className="max-w-xl mx-auto text-center">
              <p className="eyebrow flex items-center justify-center gap-3">
                <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
                Capacités
                <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
              </p>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-5 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Ce que ChronoFS tient <em className="text-gold-600 dark:text-gold-300">à votre place</em>.
              </h2>
            </Reveal>

            <div className="mt-12 md:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CarteSolveur />
              {CAPACITES.map((cap, i) => {
                const Icone = cap.icone;
                return (
                  <Reveal key={cap.titre} delay={i * 0.07} className="h-full">
                    <motion.article
                      whileHover={reduced ? undefined : { y: -6 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      className="group relative h-full overflow-hidden rounded-2xl border border-line dark:border-line-dark
                        bg-white dark:bg-surface-dark p-6 sm:p-7 shadow-card hover:shadow-card-lg transition-shadow duration-300"
                    >
                      {/* Voile navy très doux au survol — écho des cartes de l'app */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-primary-50/0 group-hover:bg-primary-50/60 dark:group-hover:bg-primary-900/20 transition-colors duration-300 pointer-events-none"
                      />
                      {/* Liseré OR qui se déploie en bas — signature de l'app */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 bottom-0 h-[2px] w-0 bg-gold-400 group-hover:w-full transition-all duration-500 ease-out pointer-events-none"
                      />

                      {/* Pastille icône : navy pleine au survol (aplat charte) */}
                      <span className="relative inline-flex w-12 h-12 rounded-xl items-center justify-center overflow-hidden
                        bg-primary-50 dark:bg-primary-900/40">
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-primary-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <Icone
                          size={19}
                          strokeWidth={1.75}
                          className="relative text-primary-900 dark:text-primary-200 group-hover:text-white transition-colors duration-300"
                          aria-hidden="true"
                        />
                      </span>

                      <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink-strong dark:text-ink-dark-strong">
                        {cap.titre}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                        {cap.texte}
                      </p>
                    </motion.article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Questions ── */}
        <section id="questions" className="scroll-mt-20 bg-white dark:bg-page-dark">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 md:py-28">
            <Reveal className="text-center">
              <p className="eyebrow flex items-center justify-center gap-3">
                <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
                Questions
                <span aria-hidden="true" className="inline-block w-8 h-px bg-gold-500 dark:bg-gold-400" />
              </p>
              <h2 className="heading-display text-ink-strong dark:text-ink-dark-strong mt-5 text-3xl sm:text-[2.6rem] leading-[1.08]">
                Avant de vous <em className="text-gold-600 dark:text-gold-300">connecter</em>.
              </h2>
            </Reveal>

            <Reveal delay={0.1} className="mt-10 md:mt-14">
              <div className="border-t border-line dark:border-line-dark">
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

        {/* ── CTA final : miroir de la carte de connexion, posé sur le pied de page ── */}
        <section className="bg-white dark:bg-page-dark px-5 sm:px-8 pt-4 md:pt-8">
          <div className="relative z-10 max-w-4xl mx-auto -mb-24 sm:-mb-28">
            <Reveal>
              <div
                className="relative overflow-hidden rounded-3xl sm:rounded-[2rem] bg-white dark:bg-surface-dark
                  grid md:grid-cols-[46%_1fr] border border-line dark:border-line-dark shadow-card-lg"
              >
                {/* ═ Panneau gauche — dégradé signature, comme la connexion ═ */}
                <div
                  className="relative overflow-hidden px-8 py-10 sm:px-10 sm:py-12 flex flex-col justify-between gap-10"
                  style={{ background: GRAD }}
                >
                  {/* Cercles décoratifs — mêmes respirations que la page de connexion */}
                  <motion.div
                    aria-hidden="true"
                    animate={reduced ? undefined : { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.07] pointer-events-none"
                  />
                  <motion.div
                    aria-hidden="true"
                    animate={reduced ? undefined : { scale: [1, 1.12, 1] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                    className="absolute -bottom-16 -left-14 w-48 h-48 rounded-full bg-gold-400/[0.12] pointer-events-none"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute bottom-16 right-8 w-20 h-20 rounded-full border border-white/12 pointer-events-none"
                  />

                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.13] border border-white/15 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                      <span className="text-white/85 text-[10px] font-semibold uppercase tracking-[0.18em]">FS · UEB</span>
                    </div>
                    <h2 className="heading-display text-white mt-5 text-[1.8rem] sm:text-[2.1rem] leading-[1.12]">
                      Votre prochaine semaine est <em className="text-gold-300">déjà composée</em>.
                    </h2>
                  </div>

                  <p className="relative font-mono text-[10px] tracking-[0.18em] uppercase text-white/60">
                    6 jours · 4 créneaux · 0 conflit
                  </p>
                </div>

                {/* ═ Panneau droit — blanc, bouton navy comme la connexion ═ */}
                <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12 flex flex-col justify-center">
                  {/* Décorations discrètes du panneau blanc de la connexion */}
                  <div
                    aria-hidden="true"
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary-900/[0.04] dark:bg-primary-200/[0.05] pointer-events-none"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-6 right-6 w-24 h-24 rounded-full border-[1.5px] border-primary-900/[0.07] dark:border-primary-200/[0.08] pointer-events-none"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-gold-400/[0.06] pointer-events-none"
                  />

                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-full overflow-hidden shrink-0 w-12 h-12"
                        style={{ boxShadow: '0 0 0 4px rgba(30,58,138,0.13)' }}
                      >
                        <img src={logoFs} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                      </span>
                      <div>
                        <p className="text-ink-strong dark:text-ink-dark-strong font-bold text-base leading-none tracking-tight">ChronoFS</p>
                        <p className="text-ink-muted dark:text-ink-dark-muted text-xs mt-0.5">Faculté des Sciences · UEB</p>
                      </div>
                    </div>

                    <h3 className="mt-6 text-xl sm:text-[1.4rem] font-extrabold tracking-tight text-ink-strong dark:text-ink-dark-strong">
                      Ouvrez votre <span className="text-primary-900 dark:text-gold-300">espace</span>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted">
                      Connectez-vous à votre espace DAR ou chef de département
                      et laissez le solveur composer.
                    </p>

                    <div className="mt-7">
                      <BoutonNavy to={cta.to}>{cta.label}</BoutonNavy>
                    </div>
                    <p className="mt-5 text-center font-mono text-[9px] tracking-[0.14em] uppercase text-ink-subtle dark:text-ink-dark-subtle">
                      Les comptes d'accès sont délivrés par la DAR
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Pied de page ── */}
      <footer className="relative overflow-hidden bg-primary-950 pt-40 sm:pt-44 pb-10">
        {/* Trame registre + forme organique en filigrane */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 31px, rgba(255,255,255,0.025) 31px 32px)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -right-28 w-[380px] h-[340px] pointer-events-none opacity-[0.16]"
          style={{ background: GRAD, borderRadius: '58% 42% 62% 38% / 48% 55% 45% 52%' }}
        />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="flex items-center gap-3">
              <img
                src={logoFs}
                alt=""
                aria-hidden="true"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/15"
              />
              <div>
                <p className="font-bold tracking-tight text-white">ChronoFS</p>
                <p className="text-xs text-white/55 mt-0.5">Faculté des Sciences · Université d'Ébolowa</p>
              </div>
            </div>

            <nav aria-label="Liens de pied de page" className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              <a
                href="#circuit"
                onClick={smoothTo('circuit')}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Le circuit
              </a>
              <a
                href="#capacites"
                onClick={smoothTo('capacites')}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Capacités
              </a>
              <a
                href="#questions"
                onClick={smoothTo('questions')}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Questions
              </a>
              <Link to={cta.to} className="text-sm text-white/60 hover:text-white transition-colors">
                {cta.label}
              </Link>
            </nav>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/40">
              © {year} FS-UEB — Faculté des Sciences
            </p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10">
              <span className="pulse-dot bg-gold-400" aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-white/60">PWA installable</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
