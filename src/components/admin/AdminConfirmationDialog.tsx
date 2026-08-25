import { useEffect, useRef, type ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type AdminConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

const AdminConfirmationDialog = ({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  danger = false,
  children,
  onClose,
  onConfirm,
}: AdminConfirmationDialogProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();
  const isHighContrast = theme === 'high-contrast';

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    cancelButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirmation-title"
        aria-describedby="admin-confirmation-description"
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${isHighContrast ? 'border-white bg-black text-white' : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}
      >
        <h2 id="admin-confirmation-title" className="text-xl font-bold">{title}</h2>
        <p id="admin-confirmation-description" className={`mt-2 text-sm leading-6 ${isHighContrast ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          {description}
        </p>
        {children && <div className={`mt-5 rounded-xl border p-4 text-sm ${isHighContrast ? 'border-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${isHighContrast ? 'border-white text-white hover:bg-white hover:text-black' : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'}`}
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-cyan-700 hover:bg-cyan-800'}`}
          >
            {busy ? 'İşleniyor...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmationDialog;
