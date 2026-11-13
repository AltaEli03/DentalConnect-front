import { statusLabels, statusTone, type StatusTone } from '../../lib/appointments';

const tones: Record<StatusTone, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  proposed: 'border-sky-200 bg-sky-50 text-sky-900',
  rejected: 'border-red-200 bg-red-50 text-red-900',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-700',
};

export function StatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}
    >
      {statusLabels[status?.toUpperCase() ?? ''] ?? status ?? 'Pendiente'}
    </span>
  );
}
