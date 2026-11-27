import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { HeaderLink } from '../../lib/headerLinks';
import { Icon } from './Icon';

export type NavItem = HeaderLink;
export type NavGroup = { label?: string; items: NavItem[] };

type NavMenuProps = {
  label: string;
  groups: NavGroup[];
  className?: string;
  panelClassName?: string;
};

export function NavMenu({ label, groups, className = '', panelClassName = '' }: NavMenuProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-brand/5 hover:text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <Icon
          name="chevron-down"
          size={14}
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className={`absolute right-0 top-full z-50 mt-2 min-w-56 rounded-panel border border-line bg-surface p-2 shadow-[var(--shadow-overlay)] ${panelClassName}`}
        >
          {groups.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex} className="py-1">
              {group.label && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center rounded-control px-3 text-sm font-medium ${
                      isActive
                        ? 'bg-surface-soft text-heading'
                        : 'text-ink hover:bg-canvas'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
