import { useT } from '../../copy';

/** Modal confirming SYSTEM / GK changes that affect more than the sounding patch. */
export function ScopeConfirm({
  open,
  title,
  body,
  scopeLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  body: string;
  scopeLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="scope-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="scope-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scope-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="scope-chip scope-system">{scopeLabel}</p>
        <h2 id="scope-confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="scope-confirm-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            {t('gr55.simple.cancel')}
          </button>
          <button type="button" className="primary" onClick={onConfirm} disabled={busy}>
            {busy ? t('gr55.simple.saving') : t('gr55.simple.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
