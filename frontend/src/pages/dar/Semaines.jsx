import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Play, Lock, Cpu, Globe, Download, FileText, Eye } from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import useAuthStore from '../../store/authStore';

// Actions disponibles selon le statut
const ACTIONS = {
  DRAFT:            [{ label: 'Ouvrir imports',  icon: Play,     key: 'ouvrir_imports',   v: 'primary'   }],
  IMPORTS_OUVERTS:  [{ label: 'Clôturer imports',icon: Lock,     key: 'cloturer_imports', v: 'primary'   }],
  IMPORTS_CLOTURES: [{ label: 'Générer planning',icon: Cpu,      key: 'generer',          v: 'primary'   }],
  GENERE: [
    { label: 'Publier',     icon: Globe,     key: 'publier',    v: 'primary'   },
    { label: 'Voir grille', icon: Eye,       key: 'voir',       v: 'secondary' },
  ],
  PUBLIE: [
    { label: 'PDF',         icon: Download,  key: 'export_pdf', v: 'secondary' },
    { label: 'DOCX',        icon: FileText,  key: 'export_docx',v: 'secondary' },
    { label: 'Grille',      icon: Eye,       key: 'voir',       v: 'ghost'     },
  ],
};

const BLANK = { date_debut: '', date_fin: '', semestre: '1', annee_academique: '', numero_reference: '' };

const iCls = 'w-full bg-ebg border border-eborder rounded-lg px-3 py-2 text-sm text-etext focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all';

function Field({ label, children }) {
  return (
    <div>
      <label className="text-emuted text-xs mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function Semaines() {
  const [semaines, setSemaines] = useState([]);
  const [annees, setAnnees]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [busy, setBusy]         = useState(null);
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const load = async () => {
    setLoading(true);
    try {
      const [sw, aa] = await Promise.all([api.get('/semaines/'), api.get('/annees-academiques/')]);
      setSemaines(Array.isArray(sw.data) ? sw.data : (sw.data.results ?? []));
      const aas = Array.isArray(aa.data) ? aa.data : (aa.data.results ?? []);
      setAnnees(aas);
      if (aas.length) {
        const active = aas.find(a => a.active) ?? aas[0];
        setForm(f => ({ ...f, annee_academique: active.id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try { await api.post('/semaines/', form); setModal(false); load(); }
    finally { setSaving(false); }
  };

  const handleAction = async (sw, key) => {
    if (key === 'voir') { navigate(`/dar/semaines/${sw.id}/planning`); return; }

    if (key === 'export_pdf' || key === 'export_docx') {
      const ext = key === 'export_pdf' ? 'pdf' : 'docx';
      setBusy(`${sw.id}-${key}`);
      try {
        const res = await api.get(`/semaines/${sw.id}/${key}/`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `Planning_${sw.date_debut}_au_${sw.date_fin}.${ext}`,
        });
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } finally { setBusy(null); }
      return;
    }

    setBusy(`${sw.id}-${key}`);
    try { await api.post(`/semaines/${sw.id}/${key}/`); load(); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Semaines</h1>
          <p className="text-emuted text-sm mt-0.5">Workflow hebdomadaire de planification</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15} /> Nouvelle semaine</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-emuted py-16 text-sm">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          Chargement…
        </div>
      ) : (
        <div className="space-y-3">
          {semaines.map((sw) => (
            <div key={sw.id} className="bg-ecard border border-eborder rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <Calendar size={14} className="text-gold shrink-0" />
                    <span className="text-etext font-medium text-sm">
                      Du {new Date(sw.date_debut).toLocaleDateString('fr-FR')} au {new Date(sw.date_fin).toLocaleDateString('fr-FR')}
                    </span>
                    <Badge status={sw.statut} />
                  </div>
                  <p className="text-emuted text-xs ml-[22px]">
                    Semestre {sw.semestre}
                    {sw.annee_academique?.libelle && ` · ${sw.annee_academique.libelle}`}
                    {sw.numero_reference && ` · Réf. ${sw.numero_reference}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(ACTIONS[sw.statut] ?? []).map((act) => {
                    const Icon = act.icon;
                    const k = `${sw.id}-${act.key}`;
                    return (
                      <Button key={act.key} size="sm" variant={act.v}
                        onClick={() => handleAction(sw, act.key)} disabled={busy === k}>
                        <Icon size={12} />
                        {busy === k ? '…' : act.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {!semaines.length && (
            <div className="text-center text-emuted py-16 text-sm">Aucune semaine créée.</div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle semaine"
        onConfirm={handleCreate} loading={saving}>
        <Field label="Date de début">
          <input type="date" className={iCls} value={form.date_debut}
            onChange={e => setForm({ ...form, date_debut: e.target.value })} required />
        </Field>
        <Field label="Date de fin">
          <input type="date" className={iCls} value={form.date_fin}
            onChange={e => setForm({ ...form, date_fin: e.target.value })} required />
        </Field>
        <Field label="Semestre">
          <select className={iCls} value={form.semestre}
            onChange={e => setForm({ ...form, semestre: e.target.value })}>
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </select>
        </Field>
        <Field label="Année académique">
          <select className={iCls} value={form.annee_academique}
            onChange={e => setForm({ ...form, annee_academique: e.target.value })}>
            {annees.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
          </select>
        </Field>
        <Field label="N° de référence (optionnel)">
          <input type="text" className={iCls} value={form.numero_reference}
            placeholder="ex : 26-00102"
            onChange={e => setForm({ ...form, numero_reference: e.target.value })} />
        </Field>
      </Modal>
    </div>
  );
}
