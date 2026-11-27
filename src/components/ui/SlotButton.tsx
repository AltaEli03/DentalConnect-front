import type { ButtonHTMLAttributes } from 'react';

export function SlotButton({
  selected = false,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      aria-pressed={selected}
      className={`min-h-11 rounded-control border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-brand bg-brand text-white'
          : 'border-control bg-surface text-ink hover:border-accent'
      } ${className}`}
    >
      {children}
    </button>
  );
}
