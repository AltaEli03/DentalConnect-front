import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiBaseUrl } from '../services/api';
import { currentIdToken } from '../services/cognito';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { StatusStamp } from '../components/ui/StatusStamp';

type Application = { id: string; clinicId?: string | null; clinicName: string; status: string; reviewNote?: string | null; createdAt: string };
type ReviewItem = { id: string; ownerEmail: string; clinicName: string; phone: string; address: string; municipality: string; state: string; postalCode: string; status: string; createdAt: string };
type Envelope<T> = { data: T };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await currentIdToken();
  const headers = new Headers(init.headers);
  if (!token) throw new Error('No hay una credencial activa para el API. La sesión visual se conserva; recarga la página y vuelve a intentarlo.');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({})) as { data?: T; error?: { message?: string } };
  if (!response.ok) {
    if (response.status === 401) throw new Error(body.error?.message ?? 'El API rechazó la autorización (401). Tu sesión de DentalConnect sigue abierta; vuelve a intentarlo.');
    if (response.status === 403) throw new Error(body.error?.message ?? 'Esta cuenta no tiene permiso para realizar esta acción (403).');
    throw new Error(body.error?.message ?? `No fue posible completar la operación (HTTP ${response.status}).`);
  }
  return body as T;
}

const emptyForm = { clinicName: '', phone: '', address: '', municipality: '', state: '', postalCode: '' };

export function ClinicApplicationPage() {
  const { user, loading, refresh } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const platformAdmin = user?.role?.split(/[\s,]+/).includes('PLATFORM_ADMIN') ?? false;

  const loadOwn = useCallback(async () => {
    setLoadingOwn(true);
    try {
      const result = await request<Envelope<Application | null>>('/clinic-applications/mine');
      setApplication(result.data);
    } finally {
      setLoadingOwn(false);
    }
  }, []);
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const result = await request<Envelope<ReviewItem[]>>('/platform/clinic-applications');
      setQueue(result.data);
    } finally {
      setLoadingQueue(false);
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    void Promise.all([loadOwn(), ...(platformAdmin ? [loadQueue()] : [])]).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No fue posible cargar la información.'));
  }, [user, platformAdmin, loadOwn, loadQueue]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await request('/clinic-applications', { method: 'POST', body: JSON.stringify(form) });
      await refresh(); await loadOwn(); setForm(emptyForm); setMessage('Consultorio registrado y publicado. Tu sesión sigue activa; ya puedes administrar su perfil y solicitudes.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible enviar la solicitud.'); }
    finally { setBusy(false); }
  };
  const publishMine = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await request('/clinic-applications/mine/publish', { method: 'POST' });
      await refresh(); await loadOwn();
      setMessage('Consultorio publicado. Tu sesión sigue activa y ya puedes administrar su perfil y solicitudes.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible publicar el consultorio.'); }
    finally { setBusy(false); }
  };
  const review = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await request(`/platform/clinic-applications/${encodeURIComponent(id)}/${action}`, { method: 'POST', ...(action === 'reject' ? { body: JSON.stringify({ reason }) } : {}) });
      await loadQueue(); setMessage(action === 'approve' ? 'Consultorio aprobado y cuenta vinculada.' : 'Solicitud rechazada.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible completar la revisión.'); }
    finally { setBusy(false); }
  };

  if (loading)
    return (
      <main className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8">
        <p role="status" className="text-muted">Comprobando sesión…</p>
      </main>
    );

  if (!user)
    return (
      <AuthLayout
        title="Solicita el registro de tu consultorio"
        description="Publica tus servicios y equipo para que las personas encuentren la atención que necesitan."
      >
        <div className="grid gap-5">
          <p className="text-sm leading-relaxed text-muted">
            Usarás una sola cuenta verificada para registrar tu consultorio y administrarlo desde
            DentalConnect.
          </p>
          <ol className="grid gap-3">
            {[
              ['Accede a tu cuenta', 'Inicia sesión o crea una cuenta y verifica tu correo.'],
              [
                'Envía los datos del consultorio',
                'Completa nombre, contacto, dirección y ubicación.',
              ],
              [
                'Completa el registro',
                'El consultorio quedará publicado al enviar el formulario.',
              ],
            ].map(([title, text], index) => (
              <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-surface-soft text-sm font-bold text-heading">
                  {index + 1}
                </span>
                <div>
                  <strong className="block text-sm font-semibold text-heading">{title}</strong>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="grid gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              to="/iniciar-sesion"
              state={{ from: '/registrar-consultorio' }}
            >
              Iniciar sesión
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-control bg-surface px-5 font-semibold text-heading hover:border-brand hover:bg-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              to="/registro"
            >
              Crear cuenta
            </Link>
          </div>
          <p className="rounded-control border border-info-border bg-info-soft p-3 text-xs leading-relaxed text-ink">
            El registro general crea una cuenta de paciente. Inicia sesión con esa cuenta para
            registrar y administrar un consultorio.
          </p>
        </div>
      </AuthLayout>
    );

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
      <PageHeader
        kicker="DentalConnect"
        title={platformAdmin ? 'Revisión de altas' : 'Registro de consultorio'}
        description={
          platformAdmin
            ? 'Revisa las solicitudes de consultorios y aprueba o rechaza su publicación.'
            : 'Completa los datos para publicar el consultorio y comenzar a configurarlo.'
        }
      />

      {error && (
        <Notice tone="error" className="mt-5">
          <p>{error}</p>
        </Notice>
      )}
      {message && (
        <Notice tone="success" className="mt-5">
          {message}
        </Notice>
      )}

      {!platformAdmin && loadingOwn && (
        <p className="mt-6 text-sm text-muted" role="status">
          Cargando registro…
        </p>
      )}

      {!platformAdmin &&
        !loadingOwn &&
        (application ? (
          <section className="mt-6 rounded-panel border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-heading">
                {application.status === 'APPROVED' ? 'Consultorio publicado' : 'Registro de consultorio'}
              </h2>
              <span className="inline-flex rounded-[4px] border border-line bg-surface-soft px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-heading">
                {application.status === 'APPROVED' ? 'Publicado' : application.status}
              </span>
            </div>
            <p className="mt-3 font-semibold text-heading">{application.clinicName}</p>
            {application.reviewNote && (
              <p className="mt-2 text-sm text-muted">Nota: {application.reviewNote}</p>
            )}
            {application.status !== 'APPROVED' ? (
              <>
                <p className="mt-3 text-sm text-muted">
                  Activa el registro existente para publicar el consultorio y vincularlo con esta
                  cuenta.
                </p>
                <Button className="mt-4" disabled={busy} loading={busy} onClick={() => void publishMine()}>
                  {busy ? 'Publicando…' : 'Publicar y activar consultorio'}
                </Button>
              </>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                  to="/consultorio/configuracion"
                >
                  Administrar consultorio
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-control border border-control bg-surface px-4 text-sm font-semibold text-heading hover:border-brand hover:bg-canvas"
                  to="/administrar-solicitudes"
                >
                  Revisar solicitudes
                </Link>
              </div>
            )}
          </section>
        ) : (
          <form
            className="mt-6 grid gap-4 rounded-panel border border-line bg-surface p-5 sm:grid-cols-2"
            onSubmit={submit}
          >
            <h2 className="font-display text-xl font-semibold text-heading sm:col-span-2">
              Datos del consultorio
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:col-span-2">
              Se publicará al guardar. Después podrás completar servicios, dentistas y horarios.
            </p>
            <Field id="clinic-name" label="Nombre del consultorio">
              <input
                id="clinic-name"
                required
                minLength={3}
                maxLength={120}
                autoComplete="organization"
                value={form.clinicName ?? ''}
                onChange={(event) => setForm({ ...form, clinicName: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field id="clinic-phone" label="Teléfono">
              <input
                id="clinic-phone"
                required
                minLength={8}
                maxLength={24}
                type="tel"
                autoComplete="tel"
                value={form.phone ?? ''}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field id="clinic-address" label="Dirección">
              <input
                id="clinic-address"
                required
                minLength={5}
                maxLength={200}
                autoComplete="street-address"
                value={form.address ?? ''}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field id="clinic-municipality" label="Municipio">
              <input
                id="clinic-municipality"
                required
                minLength={2}
                maxLength={100}
                autoComplete="address-level2"
                value={form.municipality ?? ''}
                onChange={(event) => setForm({ ...form, municipality: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field id="clinic-state" label="Estado">
              <input
                id="clinic-state"
                required
                minLength={2}
                maxLength={100}
                autoComplete="address-level1"
                value={form.state ?? ''}
                onChange={(event) => setForm({ ...form, state: event.target.value })}
                className={controlClass}
              />
            </Field>
            <Field id="clinic-postal-code" label="Código postal">
              <input
                id="clinic-postal-code"
                required
                minLength={4}
                maxLength={12}
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.postalCode ?? ''}
                onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
                className={controlClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy} loading={busy}>
                {busy ? 'Registrando…' : 'Registrar y publicar consultorio'}
              </Button>
            </div>
          </form>
        ))}

      {platformAdmin && (
        <Section className="mt-6" title="Solicitudes por revisar">
          {loadingQueue ? (
            <p className="text-sm text-muted" role="status">
              Cargando solicitudes…
            </p>
          ) : queue.length === 0 ? (
            error ? null : <p className="text-sm text-muted">No hay solicitudes pendientes.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {queue.map((item) => (
                <li key={item.id} className="grid gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-heading">
                      {item.clinicName}
                    </h3>
                    <StatusStamp status={item.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {item.ownerEmail} · {item.phone}
                  </p>
                  <p className="text-sm text-muted">
                    {item.address}, {item.municipality}, {item.state} {item.postalCode}
                  </p>
                  <Field id={`reason-${item.id}`} label="Motivo si se rechaza">
                    <input
                      id={`reason-${item.id}`}
                      maxLength={250}
                      value={form[`reason-${item.id}`] ?? ''}
                      onChange={(event) =>
                        setForm({ ...form, [`reason-${item.id}`]: event.target.value })
                      }
                      className={controlClass}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      loading={busy}
                      onClick={() => void review(item.id, 'approve')}
                    >
                      Aprobar consultorio
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void review(item.id, 'reject', form[`reason-${item.id}`] ?? '')}
                    >
                      Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </main>
  );
}
