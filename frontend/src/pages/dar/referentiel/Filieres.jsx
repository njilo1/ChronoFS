import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useCrud } from '../../../hooks/useCrud';
import api from '../../../services/api';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const iCls = 'w-full bg-ebg border border-eborder rounded-lg px-3 py-2 text-sm text-etext focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all';
function F({ label, children }) {
  return <div><label className="text-emuted text-xs mb-1 block">{label}</label>{children}</div>;
}

const NIVEAUX = ['L1','L2','L3','M1','M2'];
const BLANK = { nom: '', code: '', departement: '', niveau: 'L1', ville: 'EBOLOWA', effectif: '' };
const COLS = [
  { key: 'code',    label: 'Code' },
  { key: 'nom',     label: 'Filière' },
  { key: 'niveau',  label: 'Niveau' },
  { key: 'ville',   label: 'Ville',  render: r => r.ville === 'EBOLOWA' ? 'Ébolowa' : 'Monatélé' },
  { key: 'effectif',label: 'Effectif' },
  { key: 'departement', label: 'Département', render: r => r.departement?.code ?? '—' },
];

export default function Filieres() {
  const { data, loading, create, update, remove } = useCrud('filieres');
  const [deps, setDeps] = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/departements/').then(r => setDeps(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => {
    setForm({ ...BLANK, departement: deps[0]?.id ?? '' });
    setModal({ open: true, item: null });
  };
  const openEdit = (item) => {
    setForm({
      nom: item.nom, code: item.code, niveau: item.niveau, ville: item.ville,
      effectif: item.effectif, departement: item.departement?.id ?? item.departement,
    });
    setModal({ open: true, item });
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Filières</h1>
          <p className="text-emuted text-sm mt-0.5">Classes pédagogiques par niveau et ville</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={id => window.confirm('Supprimer ?') && remove(id)}
        emptyText="Aucune filière enregistrée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier la filière' : 'Nouvelle filière'}
        onConfirm={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Code (ex : TIC, BCH)">
            <input className={iCls} value={form.code} placeholder="TIC"
              onChange={e => setForm({ ...form, code: e.target.value })} />
          </F>
          <F label="Niveau">
            <select className={iCls} value={form.niveau}
              onChange={e => setForm({ ...form, niveau: e.target.value })}>
              {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </F>
        </div>
        <F label="Nom de la filière">
          <input className={iCls} value={form.nom} placeholder="Technologies de l'Information…"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Département">
            <select className={iCls} value={form.departement}
              onChange={e => setForm({ ...form, departement: e.target.value })}>
              {deps.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
            </select>
          </F>
          <F label="Ville">
            <select className={iCls} value={form.ville}
              onChange={e => setForm({ ...form, ville: e.target.value })}>
              <option value="EBOLOWA">Ébolowa</option>
              <option value="MONATELE">Monatélé</option>
            </select>
          </F>
        </div>
        <F label="Effectif">
          <input type="number" className={iCls} value={form.effectif} min={0}
            onChange={e => setForm({ ...form, effectif: e.target.value })} />
        </F>
      </Modal>
    </div>
  );
}
