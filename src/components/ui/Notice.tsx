import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'error' | 'warning';

const tones: Record<NoticeTone, string> = {
  info: 'border-info-border bg-info-soft text-ink',
  success: 'border-success-border bg-success-soft text-success-text',
  error: 'border-danger-border bg-danger-soft text-danger-text',
  warning: 'border-warning-border bg-warning-soft text-warning-text',
};

type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  role?: 'alert' | 'status' | 'note';
  className?: string;
  children: ReactNode;
};

export function Notice({ tone = 'info', title, role, className = '', children }: NoticeProps) {
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={`rounded-control border px-4 py-3 text-sm leading-relaxed ${tones[tone]} ${className}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}
