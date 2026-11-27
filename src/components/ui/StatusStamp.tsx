import { statusLabels, statusTone, type StatusTone } from '../../lib/appointments';

const tones: Record<StatusTone, { stamp: string; dot: string }> = {
  pending: {
    stamp:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    dot: 'bg-amber-500',
  },
  confirmed: {
    stamp:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
    dot: 'bg-emerald-500',
  },
  proposed: {
    stamp:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100',
    dot: 'bg-sky-500',
  },
  rejected: {
    stamp:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
    dot: 'bg-red-500',
  },
  cancelled: {
    stamp:
      'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    dot: 'bg-slate-400',
  },
};

export function StatusStamp({ status, className = '' }: { status?: string; className?: string }) {
  const tone = statusTone(status);
  const label = statusLabels[status?.toUpperCase() ?? ''] ?? status ?? 'Pendiente';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[4px] border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone].stamp} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${tones[tone].dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
