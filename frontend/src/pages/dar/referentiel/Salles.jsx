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

const TYPE_SALLE = ['COURS','TP','MULTIMEDIA','AMPHI','TERRAIN','LABO','BUREAU'];
const BLANK = { nom: '', campus: '', capacite: '', type_salle: 'COURS', disponible: true };
const COLS = [
  { key: 'nom',       label: 'Salle' },
  { key: 'campus',    label: 'Campus',    render: r => r.campus?.nom ?? '—' },
  { key: 'capacite',  label: 'Capacité',  render: r => `${r.capacite} places` },
  { key: 'type_salle',label: 'Type' },
  { key: 'disponible',label: 'Dispo',     render: r => r.disponible ? '✓' : '✗' },
];

export default function Salles() {
  const { data, loading, create, update, remove } = useCrud('salles');
  const [campus, setCampus] = useState([]);
  const [modal, setModal]   = useState({ open: false, item: null });
  const [form, setForm]     = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/campus/').then(r => setCampus(Array.isArray(r.data) ? r.data : (r.data.results ?? [])));
  }, []);

  const openCreate = () => {
    setForm({ ...BLANK, campus: campus[0]?.id ?? '' });
    setModal({ open: true, item: null });
  };
  const openEdit = (item) => {
    setForm({ nom: item.nom, campus: item.campus?.id ?? item.campus, capacite: item.capacite, type_salle: item.type_salle, disponible: item.disponible });
    setModal({ open: true, item });
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      modal.item ? await update(modal.item.id, form) : await create(form);
      setModal({ open: false, item: null });
    } finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette salle ?')) await remove(id);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-etext font-display text-2xl font-semibold">Salles</h1>
          <p className="text-emuted text-sm mt-0.5">Salles d'enseignement de la FS-UEB</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Ajouter</Button>
      </div>

      <Table columns={COLS} data={data} loading={loading}
        onEdit={openEdit} onDelete={handleDelete} emptyText="Aucune salle enregistrée." />

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? 'Modifier la salle' : 'Nouvelle salle'}
        onConfirm={handleSave} loading={saving}>
        <F label="Nom de la salle">
          <input className={iCls} value={form.nom} placeholder="ex : Salle A"
            onChange={e => setForm({ ...form, nom: e.target.value })} />
        </F>
        <F label="Campus">
          <select className={iCls} value={form.campus}
            onChange={e => setForm({ ...form, campus: e.target.value })}>
            {campus.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Capacité (places)">
            <input type="number" className={iCls} value={form.capacite} min={1}
              onChange={e => setForm({ ...form, capacite: e.target.value })} />
          </F>
          <F label="Type de salle">
            <select className={iCls} value={form.type_salle}
              onChange={e => setForm({ ...form, type_salle: e.target.value })}>
              {TYPE_SALLE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>
        </div>
        <label className="flex items-center gap-2 text-sm text-etext cursor-pointer">
          <input type="checkbox" checked={form.disponible}
            onChange={e => setForm({ ...form, disponible: e.target.checked })}
            className="accent-gold" />
          Salle disponible
        </label>
      </Modal>
    </div>
  );
}
