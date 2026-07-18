import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Target, Trash2, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { useCrud } from '../../hooks/useCrud';
import { toast } from '../../store/toastStore';
import { extractApiError } from '../../services/apiError';
import PageShell from '../../components/ui/PageShell';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../services/api';

function SortableCard({ obj, index, onToggle, onDelete, busy }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: obj.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };
  const sensMax = obj.sens === 'MAX';
  return (
    <div ref={setNodeRef} style={style}
      className={`group flex items-center gap-3 bg-white dark:bg-surface-dark border rounded-xl px-4 py-3 shadow-card ${isDragging ? 'border-gold-400 shadow-card-lg' : 'border-line dark:border-line-dark'}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-ink-subtle dark:text-ink-dark-subtle hover:text-ink dark:hover:text-ink-dark shrink-0" title="Glisser pour réordonner">
        <GripVertical size={16} />
      </button>
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-900 dark:bg-gold-500 text-white dark:text-page-dark text-xs font-bold num shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-ink-strong dark:text-ink-dark-strong truncate">{obj.nom}</p>
          {obj.verrouillee && <Lock size={11} className="text-gold-600 dark:text-gold-400 shrink-0" />}
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${sensMax ? 'text-success' : 'text-info'}`}>
            {sensMax ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{obj.sens_display ?? obj.sens}
          </span>
        </div>
        {obj.description && <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-0.5 leading-snug truncate">{obj.description}</p>}
      </div>
      <button
        onClick={() => onToggle(obj)} disabled={busy === `t-${obj.id}`}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${obj.active_par_defaut ? 'bg-primary-900 dark:bg-gold-500' : 'bg-line-strong dark:bg-line-dark-strong'} disabled:opacity-40`}
        title="Actif par défaut">
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${obj.active_par_defaut ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
      {obj.verrouillee ? (
        <span className="w-7 text-center text-ink-subtle dark:text-ink-dark-subtle shrink-0" title="Objectif fondateur verrouillé"><Lock size={13} /></span>
      ) : (
        <button onClick={() => onDelete(obj)} disabled={busy === `d-${obj.id}`}
          className="p-1.5 text-ink-muted dark:text-ink-dark-muted hover:text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-40 shrink-0" title="Supprimer">
          <Trash2 size={13} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}

export default function Objectifs() {
  const { data, loading, refetch } = useCrud('fonctions-objectif', { nom: 'Objectif', genre: 'm' });
  const [items, setItems] = useState([]);
  const [busy, setBusy]   = useState(null);
  const [confirm, setConfirm] = useState({ open: false });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    setItems([...data].sort((a, b) => (a.priorite ?? 0) - (b.priorite ?? 0)));
  }, [data]);

  const persistOrder = async (ordered) => {
    try {
      await api.post('/fonctions-objectif/reordonner/', { ordre: ordered.map(o => o.id) });
      toast.success('Priorités mises à jour.');
      refetch();
    } catch (err) {
      toast.error(extractApiError(err));
      refetch();
    }
  };

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    persistOrder(reordered);
  };

  const onToggle = async (obj) => {
    setBusy(`t-${obj.id}`);
    try { await api.patch(`/fonctions-objectif/${obj.id}/`, { active_par_defaut: !obj.active_par_defaut }); await refetch(); }
    catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(null); }
  };

  const onDelete = (obj) => setConfirm({ open: true, id: obj.id, nom: obj.nom });
  const execDelete = async () => {
    const { id } = confirm; setConfirm({ open: false }); setBusy(`d-${id}`);
    try { await api.delete(`/fonctions-objectif/${id}/`); await refetch(); toast.success('Objectif supprimé.'); }
    catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(null); }
  };

  return (
    <PageShell
      icon={Target}
      eyebrow="Configuration du solver"
      title="Fonctions objectif"
      subtitle="Ordre lexicographique de la génération — glissez pour réordonner les priorités"
      count={loading ? null : items.length}
    >
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary-50/60 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/40">
        <Info size={16} className="text-primary-700 dark:text-primary-300 shrink-0 mt-0.5" />
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
          La position <strong>1</strong> est prioritaire sur toutes les suivantes (cascade lexicographique) :
          un gain sur un objectif prime toujours sur tout gain d'un objectif de rang inférieur.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {items.map((obj, i) => (
                <SortableCard key={obj.id} obj={obj} index={i} onToggle={onToggle} onDelete={onDelete} busy={busy} />
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={confirm.open} title="Supprimer cet objectif ?"
        description={`« ${confirm.nom} » ne sera plus pris en compte lors des générations.`}
        confirmLabel="Supprimer" variant="danger"
        onConfirm={execDelete} onCancel={() => setConfirm({ open: false })}
      />
    </PageShell>
  );
}
