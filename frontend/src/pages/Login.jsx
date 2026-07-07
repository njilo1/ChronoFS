import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { login } from '../services/auth';
import logoFs  from '../assets/logo_fs.png';
import heroImg from '../assets/img_login.png';

const iCls =
  'w-full bg-[#F4F7FD] border border-[#E2E8F4] rounded-xl px-4 py-3 text-sm text-ink ' +
  'placeholder:text-ink-subtle/50 focus:outline-none focus:bg-white ' +
  'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all';

const rise = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0  },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
});

/* ════════════════════════════════════════════
   BOUTON — shimmer + ripple au clic + glow pulsant
════════════════════════════════════════════ */
function ConnexionButton({ loading }) {
  const [hovered, setHovered]   = useState(false);
  const [ripples, setRipples]   = useState([]);
  const shimmer = useAnimation();

  const handleHoverStart = () => {
    setHovered(true);
    shimmer.start({
      x: ['-130%', '330%'],
      transition: { duration: 0.6, ease: 'easeInOut' },
    });
  };
  const handleHoverEnd = () => {
    setHovered(false);
    shimmer.stop();
    shimmer.set({ x: '-130%' });
  };

  /* Ripple : enregistre position du clic */
  const handlePointerDown = (e) => {
    if (loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id   = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 700);
  };

  return (
    <motion.button
      type="submit"
      disabled={loading}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onPointerDown={handlePointerDown}
      whileHover={{ scale: loading ? 1 : 1.02  }}
      whileTap={{   scale: loading ? 1 : 0.965,
        transition: { type: 'spring', stiffness: 520, damping: 20 } }}
      /* Glow pulsant en veille */
      animate={!loading ? {
        boxShadow: [
          '0 3px 14px rgba(20,56,148,0.28)',
          '0 3px 14px rgba(20,56,148,0.28), 0 0 22px rgba(20,56,148,0.18)',
          '0 3px 14px rgba(20,56,148,0.28)',
        ],
      } : {}}
      transition={!loading ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="relative w-full overflow-hidden text-white font-semibold py-3.5 rounded-xl text-sm disabled:opacity-60 select-none"
      style={{ background: '#143894' }}
    >
      {/* ── Shimmer balayage ── */}
      <motion.span
        animate={shimmer}
        initial={{ x: '-130%' }}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '42%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)',
          transform: 'skewX(-12deg)',
        }}
      />

      {/* ── Ripples au clic ── */}
      {ripples.map(rp => (
        <motion.span
          key={rp.id}
          initial={{ scale: 0, opacity: 0.45 }}
          animate={{ scale: 8, opacity: 0   }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="absolute pointer-events-none rounded-full bg-white"
          style={{ width: 40, height: 40, left: rp.x - 20, top: rp.y - 20 }}
        />
      ))}

      {/* ── Contenu ── */}
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Connexion…
        </span>
      ) : (
        <span className="relative flex items-center justify-center gap-2">
          <motion.span
            animate={{ x: hovered ? -4 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            Connexion
          </motion.span>
          <motion.span
            animate={{ x: hovered ? 5 : 0, opacity: hovered ? 1 : 0.45 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            <ArrowRight size={15} />
          </motion.span>
        </span>
      )}
    </motion.button>
  );
}

/* ════════════════════════════
   PAGE
════════════════════════════ */
export default function Login() {
  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      navigate(data.role === 'DAR' ? '/dar' : '/chef', { replace: true });
    } catch {
      setError("Identifiants incorrects. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
      style={{ background: '#F4F8FF' }}
    >
      {/* ── Forme haut-gauche — se détache du coin, devient un cercle parfait,
          percute au centre, puis reprend son galbe organique en revenant. ── */}
      <motion.div
        initial={{ x: 0, y: 0 }}
        animate={{
          x: [0, 430, 0],
          y: [0, 360, 0],
          width:  [720, 620, 620, 720],
          height: [620, 620, 620, 620],
          borderRadius: [
            '58% 42% 62% 38% / 48% 55% 45% 52%',
            '50% 50% 50% 50% / 50% 50% 50% 50%',
            '50% 50% 50% 50% / 50% 50% 50% 50%',
            '58% 42% 62% 38% / 48% 55% 45% 52%',
          ],
        }}
        transition={{
          duration: 1.5, ease: 'easeInOut',
          x: { duration: 1.5, ease: 'easeInOut', times: [0, 0.5, 1] },
          y: { duration: 1.5, ease: 'easeInOut', times: [0, 0.5, 1] },
          width:        { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
          height:       { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
          borderRadius: { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
        }}
        style={{
          position: 'absolute',
          top: -260, left: -220,
          width: 720, height: 620,
          borderRadius: '58% 42% 62% 38% / 48% 55% 45% 52%',
          background: 'linear-gradient(150deg, #143894 0%, #1C4BD4 55%, #2F74E8 100%)',
          rotate: -18,
          pointerEvents: 'none',
        }} />

      {/* ── Forme bas-droit — même chorégraphie : cercle parfait en déplacement,
          galbe organique au retour. ── */}
      <motion.div
        initial={{ x: 0, y: 0 }}
        animate={{
          x: [0, -430, 0],
          y: [0, -360, 0],
          width:  [680, 700, 700, 680],
          height: [760, 700, 700, 760],
          borderRadius: [
            '62% 38% 42% 58% / 55% 60% 40% 45%',
            '50% 50% 50% 50% / 50% 50% 50% 50%',
            '50% 50% 50% 50% / 50% 50% 50% 50%',
            '62% 38% 42% 58% / 55% 60% 40% 45%',
          ],
        }}
        transition={{
          duration: 1.5, ease: 'easeInOut',
          x: { duration: 1.5, ease: 'easeInOut', times: [0, 0.5, 1] },
          y: { duration: 1.5, ease: 'easeInOut', times: [0, 0.5, 1] },
          width:        { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
          height:       { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
          borderRadius: { duration: 1.5, ease: 'easeInOut', times: [0, 0.14, 0.86, 1] },
        }}
        style={{
          position: 'absolute',
          bottom: -240, right: -220,
          width: 680, height: 760,
          borderRadius: '62% 38% 42% 58% / 55% 60% 40% 45%',
          background: 'linear-gradient(150deg, #143894 0%, #1C4BD4 55%, #2F74E8 100%)',
          rotate: 22,
          pointerEvents: 'none',
        }} />

      {/* ══════ CARTE ══════ */}
      <motion.div
        initial={{ opacity:0, y:28, scale:0.97 }}
        animate={{ opacity:1, y:0,  scale:1    }}
        transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
        className="relative w-full bg-white rounded-3xl sm:rounded-[2rem] overflow-hidden flex md:min-h-[560px] my-auto"
        style={{
          maxWidth: 900,
          boxShadow: '0 24px 80px rgba(20,56,148,0.13), 0 4px 20px rgba(20,56,148,0.07)',
        }}
      >

        {/* ══ PANNEAU GAUCHE — bleu ══ */}
        <div
          className="hidden md:flex md:w-[46%] relative flex-col justify-between overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #143894 0%, #1C4BD4 55%, #2F74E8 100%)' }}
        >
          {/* Cercles déco */}
          <motion.div animate={{ scale:[1,1.1,1], opacity:[0.5,0.8,0.5] }}
            transition={{ duration:10, repeat:Infinity, ease:'easeInOut' }}
            style={{ position:'absolute', top:-90, right:-90, width:300, height:300,
              borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
          <motion.div animate={{ scale:[1,1.12,1] }}
            transition={{ duration:14, repeat:Infinity, ease:'easeInOut', delay:3 }}
            style={{ position:'absolute', bottom:140, left:-70, width:200, height:200,
              borderRadius:'50%', background:'rgba(6,182,212,0.15)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:90, right:24, width:100, height:100,
            borderRadius:'50%', border:'1px solid rgba(255,255,255,0.12)', pointerEvents:'none' }} />

          {/* Texte haut */}
          <motion.div {...rise(0.35)} className="relative z-10 px-8 pt-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
              style={{ background:'rgba(255,255,255,0.13)', backdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,0.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
              <span className="text-white/80 text-[10px] font-semibold uppercase tracking-[0.18em]">FS · UEB</span>
            </div>
            <h2 className="text-white leading-[1.15]"
              style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:36, fontWeight:600 }}>
              Gestion des<br />emplois du temps
            </h2>
            {/* "Faculté des Sciences / Université d'Ébolowa" supprimé */}
          </motion.div>

          {/* ── Image — plus grande, sans flottement, avec effets ── */}
          <motion.div
            initial={{ opacity:0, y:40 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:0.4, duration:0.7, ease:'easeOut' }}
            className="relative z-10 w-full px-1 flex-1 flex items-center mt-[-24px]"
          >
            <img
              src={heroImg}
              alt="Illustration EDT"
              className="w-full object-contain"
              style={{
                mixBlendMode: 'multiply',
                transform: 'scale(1.33)',
                transformOrigin: 'center bottom',
                filter: 'drop-shadow(0px 24px 48px rgba(20,56,148,0.55)) drop-shadow(0px 6px 16px rgba(6,182,212,0.25)) brightness(1.05) contrast(1.04) saturate(1.1)',
              }}
            />
          </motion.div>
        </div>

        {/* ══ PANNEAU DROIT — blanc avec décoration ══ */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 relative overflow-hidden">

          {/* ─ Éléments décoratifs fond blanc (du modèle) ─ */}
          {/* Grand cercle bleu très léger haut-droit */}
          <div style={{ position:'absolute', top:-100, right:-100, width:320, height:320,
            borderRadius:'50%', background:'rgba(20,56,148,0.045)', pointerEvents:'none', zIndex:0 }} />
          {/* Anneau haut-droit */}
          <div style={{ position:'absolute', top:30, right:30, width:160, height:160,
            borderRadius:'50%', border:'1.5px solid rgba(20,56,148,0.07)', pointerEvents:'none', zIndex:0 }} />
          {/* Petit cercle cyan bas-gauche */}
          <div style={{ position:'absolute', bottom:-60, left:-60, width:200, height:200,
            borderRadius:'50%', background:'rgba(6,182,212,0.06)', pointerEvents:'none', zIndex:0 }} />
          {/* Anneau bas-gauche */}
          <div style={{ position:'absolute', bottom:40, left:40, width:90, height:90,
            borderRadius:'50%', border:'1px solid rgba(6,182,212,0.1)', pointerEvents:'none', zIndex:0 }} />
          {/* Point décoratif discret */}
          <div style={{ position:'absolute', top:'42%', right:24, width:7, height:7,
            borderRadius:'50%', background:'rgba(20,56,148,0.12)', pointerEvents:'none', zIndex:0 }} />
          <div style={{ position:'absolute', top:'48%', right:16, width:4, height:4,
            borderRadius:'50%', background:'rgba(6,182,212,0.2)', pointerEvents:'none', zIndex:0 }} />

          {/* Contenu au-dessus des décorations */}
          <div className="relative z-10">

            {/* Logo + identité — logo agrandi */}
            <motion.div {...rise(0.28)} className="flex items-center gap-3 mb-6 sm:mb-7">
              <motion.div
                whileHover={{ scale:1.08, rotate:3 }}
                transition={{ type:'spring', stiffness:300, damping:16 }}
                className="rounded-full overflow-hidden shrink-0 w-16 h-16 sm:w-[84px] sm:h-[84px]"
                style={{ boxShadow: '0 0 0 4px rgba(20,56,148,0.13)' }}
              >
                <img src={logoFs} alt="FS-UEB" className="w-full h-full object-cover" />
              </motion.div>
              <div>
                <p className="text-ink-strong font-bold text-base leading-none tracking-tight">ChronoFS</p>
                <p className="text-ink-muted text-xs mt-0.5">Faculté des Sciences · UEB</p>
              </div>
            </motion.div>

            {/* Titre — une seule ligne, Plus Jakarta Sans ExtraBold */}
            <motion.div {...rise(0.36)} className="mb-7">
              <h1
                className="text-ink-strong leading-tight"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                Bienvenue sur <span style={{ color:'#143894' }}>ChronoFS</span>
              </h1>
              <p className="text-ink-muted text-sm mt-2 leading-relaxed">
                Accédez à votre espace pour gérer les emplois du temps.
              </p>
            </motion.div>

            {/* Erreur */}
            <AnimatePresence>
              {error && (
                <motion.div key="err"
                  initial={{ opacity:0, height:0, marginBottom:0 }}
                  animate={{ opacity:1, height:'auto', marginBottom:16 }}
                  exit={{ opacity:0, height:0, marginBottom:0 }}
                  className="overflow-hidden">
                  <div className="flex items-start gap-2 px-3.5 py-2.5 bg-danger/8 border border-danger/20 rounded-xl text-danger text-sm">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div {...rise(0.44)}>
                <label className="text-ink-muted text-[10px] font-semibold mb-1.5 block uppercase tracking-widest">
                  Nom d'utilisateur
                </label>
                <div className="relative group">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                  <input type="text" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className={iCls} style={{ paddingLeft:38 }}
                    placeholder="nom.utilisateur" required autoFocus />
                </div>
              </motion.div>

              <motion.div {...rise(0.51)}>
                <label className="text-ink-muted text-[10px] font-semibold mb-1.5 block uppercase tracking-widest">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className={iCls} style={{ paddingLeft:38, paddingRight:42 }}
                    placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-primary-700 transition-colors">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </motion.div>

              <motion.div {...rise(0.58)} className="pt-1">
                <ConnexionButton loading={loading} />
              </motion.div>
            </form>

          </div>
        </div>

      </motion.div>
    </div>
  );
}
