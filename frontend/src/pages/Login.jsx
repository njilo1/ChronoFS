import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { login } from '../services/auth';

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
      setError('Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ebg flex items-center justify-center relative overflow-hidden font-body">
      {/* Décoration de fond */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full bg-gold/[0.025] blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 rounded-full bg-gold/[0.025] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-gold/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-gold/[0.06]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-sm mx-5"
      >
        {/* Ligne dorée haute */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent mb-8 opacity-50" />

        {/* En-tête */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 border border-gold/30 rounded-xl mb-4">
            <span className="text-gold font-display text-xl font-semibold">FS</span>
          </div>
          <h1 className="text-etext font-display text-2xl font-semibold tracking-wide">ChronoFS</h1>
          <p className="text-emuted text-sm mt-1 leading-snug">
            Faculté des Sciences<br />Université d'Ébolowa
          </p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-ecard border border-eborder rounded-xl p-6 shadow-2xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifiant */}
            <div>
              <label className="text-emuted text-xs mb-1.5 block">Identifiant</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emuted" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-ebg border border-eborder rounded-lg pl-9 pr-4 py-2.5 text-sm text-etext placeholder:text-emuted/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
                  placeholder="nom.utilisateur"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-emuted text-xs mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emuted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-ebg border border-eborder rounded-lg pl-9 pr-9 py-2.5 text-sm text-etext placeholder:text-emuted/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emuted hover:text-etext transition-colors"
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ebg font-semibold py-2.5 rounded-lg text-sm hover:bg-gold-lt active:bg-gold-dk transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Ligne dorée basse */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent mt-8 opacity-50" />
        <p className="text-center text-emuted/40 text-[10px] mt-3 uppercase tracking-widest">
          FSChrono v2 · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
