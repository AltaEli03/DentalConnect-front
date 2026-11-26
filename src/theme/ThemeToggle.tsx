import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTheme } from './ThemeProvider';
import type { ThemePreference } from '../lib/theme';
import { Icon, type IconName } from '../components/ui/Icon';

const options: Array<{ value: ThemePreference; label: string; icon: IconName }> = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
  { value: 'system', label: 'Sistema', icon: 'monitor' },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === preference) ?? options[2];
  const CurrentIcon: ReactNode = <Icon name={current.icon} size={16} />;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (value: ThemePreference) => {
    setPreference(value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-alt px-3 text-[13px] font-semibold text-heading transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        aria-label={`Tema de la interfaz: ${current.label}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {CurrentIcon}
        <span className="hidden sm:inline">{current.label}</span>
        <Icon name="chevron-down" size={14} className={open ? 'rotate-180' : undefined} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-panel border border-line bg-surface p-1.5 shadow-[var(--shadow-overlay)]"
          role="group"
          aria-label="Tema de la interfaz"
        >
          {options.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-medium text-ink hover:bg-surface-soft"
              aria-pressed={preference === value}
              onClick={() => choose(value)}
            >
              <Icon name={icon} size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
