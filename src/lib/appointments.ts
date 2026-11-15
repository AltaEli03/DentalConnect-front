export const timeZone = 'America/Mexico_City';

export const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  PROPOSED: 'Con propuesta',
};

export type StatusTone = 'pending' | 'confirmed' | 'proposed' | 'rejected' | 'cancelled';

export function statusTone(status?: string): StatusTone {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'PROPOSED':
      return 'proposed';
    case 'REJECTED':
      return 'rejected';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone,
});
const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone,
});
const todayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone });

function parse(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDateTime(value?: string | null) {
  const date = parse(value);
  return date ? dateTimeFormatter.format(date) : 'No disponible';
}

export function formatTime(value?: string | null) {
  const date = parse(value);
  return date ? timeFormatter.format(date) : 'No disponible';
}

export function localToday() {
  return todayFormatter.format(new Date());
}
