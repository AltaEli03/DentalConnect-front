import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
};

export function AuthLayout({
  title,
  description,
  children,
  wide = false,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="bg-canvas px-5 py-12 sm:py-16">
      <div className={`mx-auto w-full ${wide ? 'max-w-[720px]' : 'max-w-[440px]'}`}>
        <Link
          to="/clinics"
          className="font-display text-xl font-extrabold tracking-[-0.04em] text-heading"
        >
          Dental<span className="text-accent">Connect</span>
        </Link>
        <div className="mt-5 rounded-card border border-line bg-surface p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-heading">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm leading-relaxed text-muted">{footer}</div>}
      </div>
    </main>
  );
}
