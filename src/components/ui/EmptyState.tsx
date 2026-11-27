import type { ReactNode } from 'react';

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h2 className="font-display text-xl font-semibold text-heading">{title}</h2>
      {children && (
        <div className="max-w-[55ch] text-sm leading-relaxed text-muted">{children}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
