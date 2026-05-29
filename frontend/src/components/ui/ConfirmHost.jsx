import ConfirmDialog from './ConfirmDialog';
import useConfirmStore from '../../store/confirmStore';

/**
 * Hôte unique du dialogue de confirmation, monté une fois dans le Layout.
 * Branche le ConfirmDialog existant sur le store promisifié.
 */
export default function ConfirmHost() {
  const state   = useConfirmStore((s) => s.state);
  const resolve = useConfirmStore((s) => s.resolve);

  return (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
    />
  );
}
