import type { ReactNode } from 'react';

export type ReceiptRow = {
  label: string;
  value: ReactNode;
};

type ReceiptProps = {
  title?: string;
  rows: ReceiptRow[];
  footer?: ReactNode;
  className?: string;
};

export function Receipt({ title, rows, footer, className = '' }: ReceiptProps) {
  return (
    <div className={`rounded-panel border border-line bg-surface ${className}`}>
      {title && (
        <h2 className="border-b border-line px-4 py-3 font-display text-lg font-semibold text-heading">
          {title}
        </h2>
      )}
      <dl className="divide-y divide-line px-4">
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="flex items-start justify-between gap-4 py-3 text-sm"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-right font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
    </div>
  );
}
