import type { ReactNode } from 'react';

type AuthLayoutProps = {
  title: string;
  visualTitle?: string;
  visualText?: string;
  children: ReactNode;
  hideVisual?: boolean;
  wide?: boolean;
};

export function AuthLayout({
  title,
  visualTitle,
  visualText,
  children,
  hideVisual = false,
  wide = false,
}: AuthLayoutProps) {
  return (
    <main className={`auth-layout ${hideVisual ? 'no-visual' : ''}`}>
      {!hideVisual && (
        <div className="auth-visual">
          <h2>{visualTitle || 'DentalConnect'}</h2>
          <p>
            {visualText || 'Consulta consultorios y organiza tus solicitudes de atención dental.'}
          </p>
        </div>
      )}
      <div className="auth-content">
        <div className={`auth-form-box ${wide ? 'auth-form-box-wide' : ''}`}>
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
