import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';

export type AdminSection = 'appointments' | 'requests' | 'profile' | 'team';

const sections: Array<{ id: AdminSection; to: string; label: string }> = [
  { id: 'appointments', to: '/consultorio/citas', label: 'Citas' },
  { id: 'requests', to: '/administrar-solicitudes', label: 'Solicitudes' },
  { id: 'profile', to: '/consultorio/configuracion', label: 'Perfil y servicios' },
  { id: 'team', to: '/administrar-dentistas', label: 'Dentistas y horarios' },
];

export function AdminSectionNav({ active }: { active: AdminSection }) {
  return (
    <nav
      className="mt-5 flex flex-wrap gap-1 border-b border-line"
      aria-label="Secciones del consultorio"
    >
      {sections.map((section) => (
        <Link
          key={section.id}
          to={section.to}
          aria-current={section.id === active ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${
            section.id === active
              ? 'border-accent text-heading'
              : 'border-transparent text-subtle hover:text-heading'
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

type AdminShellProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  clinicName?: string;
  active: AdminSection;
  children: ReactNode;
};

export function AdminShell({
  title,
  description,
  actions,
  clinicName,
  active,
  children,
}: AdminShellProps) {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
      <PageHeader
        kicker={clinicName ?? 'Consultorio'}
        title={title}
        description={description}
        actions={actions}
      />
      <AdminSectionNav active={active} />
      <div className="mt-6">{children}</div>
    </main>
  );
}
