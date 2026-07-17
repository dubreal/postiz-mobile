import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { CircleNotch, Warning } from '@phosphor-icons/react';

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] px-4 min-h-[44px] text-[15px] font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-btnPrimary/60';
  const variants = {
    primary: 'bg-btnPrimary text-white hover:brightness-110',
    ghost: 'bg-btnSimple text-newTextColor hover:bg-boxHover',
    danger: 'bg-transparent text-[#ff6b6b] hover:bg-[#ff6b6b]/10',
  } as const;
  return (
    <button
      className={cx(base, variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <CircleNotch size={18} className="animate-spin" weight="bold" />}
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-newTableText">
      <CircleNotch size={28} className="animate-spin" weight="bold" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('animate-pulse rounded-[10px] bg-newBgColorInner', className)}
      aria-hidden
    />
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-newTableText">{icon}</div>}
      <h2 className="text-base font-semibold text-newTextColor">{title}</h2>
      {hint && <p className="max-w-[42ch] text-sm text-newTableText">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Warning size={28} className="text-[#ff6b6b]" weight="fill" />
      <p className="max-w-[46ch] text-sm text-newTableText">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-newBorder bg-newBgColorInner p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1.5 text-base font-bold text-newTextColor">{title}</h2>
        <p className="mb-5 text-sm text-newTableText">{message}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { cx };
