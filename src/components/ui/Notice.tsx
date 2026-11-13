import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'error';

const tones: Record<NoticeTone, string> = {
  info: 'border-accent/30 bg-accent/5 text-ink',
  success: 'border-success/30 bg-success/5 text-ink',
  error: 'border-danger/30 bg-danger/5 text-ink',
};

type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  role?: 'alert' | 'status';
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
