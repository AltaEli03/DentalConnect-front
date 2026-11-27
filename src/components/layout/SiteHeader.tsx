import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { headerLinks } from '../../lib/headerLinks';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { NavMenu, type NavGroup } from '../ui/NavMenu';

export function SiteHeader() {
  const { user } = useAuth();
  const links = headerLinks(user);
  const mobileGroups: NavGroup[] = [
    { label: 'Explorar', items: links.primary },
    ...(links.clinic.length ? [{ label: 'Consultorio', items: links.clinic }] : []),
    ...(links.platform.length ? [{ label: 'Plataforma', items: links.platform }] : []),
    { label: 'Mi cuenta', items: links.account },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-[58px] w-full max-w-[1180px] items-center justify-between gap-4 px-5 lg:min-h-[68px] lg:px-8">
        <Link
          to="/clinics"
          className="font-display text-[23px] font-extrabold tracking-[-0.04em] text-heading whitespace-nowrap"
          aria-label="DentalConnect, inicio"
        >
          Dental<span className="text-accent">Connect</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {links.primary.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center px-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-heading underline decoration-accent decoration-2 underline-offset-[10px]'
                    : 'text-muted hover:text-heading'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {links.clinic.length > 0 && (
            <NavMenu label="Consultorio" groups={[{ items: links.clinic }]} />
          )}

          {links.platform.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center px-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-heading underline decoration-accent decoration-2 underline-offset-[10px]'
                    : 'text-muted hover:text-heading'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex">
            {links.account.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="inline-flex min-h-11 items-center rounded-control border border-line-strong px-3 text-[13px] font-semibold text-heading transition-colors hover:border-accent hover:bg-surface-soft"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <ThemeToggle />
          <NavMenu
            label="Menú"
            groups={mobileGroups}
            className="lg:hidden"
            panelClassName="fixed! inset-x-0 top-[58px] z-50 max-h-[calc(100vh-4rem)] overflow-y-auto lg:hidden"
          />
        </div>
      </div>
    </header>
  );
}
