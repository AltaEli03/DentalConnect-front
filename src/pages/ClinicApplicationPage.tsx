import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiBaseUrl } from '../services/api';
import { currentIdToken } from '../services/cognito';
import { AuthLayout } from '../components/auth/AuthLayout';

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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const platformAdmin = user?.role?.split(/[\s,]+/).includes('PLATFORM_ADMIN') ?? false;

  const loadOwn = useCallback(async () => {
    const result = await request<Envelope<Application | null>>('/clinic-applications/mine');
    setApplication(result.data);
  }, []);
  const loadQueue = useCallback(async () => {
    const result = await request<Envelope<ReviewItem[]>>('/platform/clinic-applications');
    setQueue(result.data);
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

  if (loading) return <section className="page-section" aria-busy="true"><p role="status">Comprobando sesión…</p></section>;
  if (!user) return <AuthLayout
    title="Solicita el registro de tu consultorio"
    description="Publica tus servicios y equipo para que las personas encuentren la atención que necesitan."
  >
    <div className="clinic-access-content">
      <p className="clinic-access-intro">Usarás una sola cuenta verificada para registrar tu consultorio y administrarlo desde DentalConnect.</p>
      <ol className="clinic-access-steps">
        <li><span aria-hidden="true">1</span><div><strong>Accede a tu cuenta</strong><p>Inicia sesión o crea una cuenta y verifica tu correo.</p></div></li>
        <li><span aria-hidden="true">2</span><div><strong>Envía los datos del consultorio</strong><p>Completa nombre, contacto, dirección y ubicación.</p></div></li>
        <li><span aria-hidden="true">3</span><div><strong>Completa el registro</strong><p>El consultorio quedará publicado al enviar el formulario.</p></div></li>
      </ol>
      <div className="clinic-access-actions">
        <Link className="btn btn-primary btn-full" to="/iniciar-sesion" state={{ from: '/registrar-consultorio' }}>Iniciar sesión</Link>
        <Link className="btn btn-outline btn-full" to="/registro">Crear cuenta</Link>
      </div>
      <p className="clinic-access-note">El registro general crea una cuenta de paciente. Inicia sesión con esa cuenta para registrar y administrar un consultorio.</p>
    </div>
  </AuthLayout>;

  return <section className="page-section clinic-application-page" aria-labelledby="clinic-application-title">
    <header className="page-heading"><p className="eyebrow">DentalConnect</p><h1 id="clinic-application-title">Registro de consultorio</h1><p>Completa los datos para publicar el consultorio y comenzar a configurarlo.</p></header>
    {error && <p role="alert" className="form-message form-message-error">{error}</p>}
    {message && <p role="status" className="form-message form-message-success">{message}</p>}
    {!platformAdmin && (application ? <article className="surface-card clinic-application-status"><h2>{application.status === 'APPROVED' ? 'Consultorio publicado' : 'Registro de consultorio'}</h2><p><strong>{application.clinicName}</strong></p><p>Estado: <strong>{application.status === 'APPROVED' ? 'Publicado' : application.status}</strong></p>{application.reviewNote && <p>Nota: {application.reviewNote}</p>}{application.status !== 'APPROVED' ? <><p>Activa el registro existente para publicar el consultorio y vincularlo con esta cuenta.</p><button className="button button-primary" type="button" disabled={busy} onClick={() => void publishMine()}>{busy ? 'Publicando…' : 'Publicar y activar consultorio'}</button></> : <div className="form-actions"><Link className="button button-primary" to="/consultorio/configuracion">Administrar consultorio</Link><Link className="button" to="/administrar-solicitudes">Revisar solicitudes</Link></div>}</article> : <form className="surface-card form-grid clinic-application-form" onSubmit={submit}>
      <h2>Datos del consultorio</h2><p>Se publicará al guardar. Después podrás completar servicios, dentistas y horarios.</p>
      <label>Nombre del consultorio<input required minLength={3} maxLength={120} autoComplete="organization" value={form.clinicName ?? ''} onChange={e => setForm({ ...form, clinicName: e.target.value })} /></label>
      <label>Teléfono<input required minLength={8} maxLength={24} type="tel" autoComplete="tel" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
      <label>Dirección<input required minLength={5} maxLength={200} autoComplete="street-address" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
      <label>Municipio<input required minLength={2} maxLength={100} autoComplete="address-level2" value={form.municipality ?? ''} onChange={e => setForm({ ...form, municipality: e.target.value })} /></label>
      <label>Estado<input required minLength={2} maxLength={100} autoComplete="address-level1" value={form.state ?? ''} onChange={e => setForm({ ...form, state: e.target.value })} /></label>
      <label>Código postal<input required minLength={4} maxLength={12} inputMode="numeric" autoComplete="postal-code" value={form.postalCode ?? ''} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></label>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Registrando…' : 'Registrar y publicar consultorio'}</button>
    </form>)}
    {platformAdmin && <section className="surface-card" aria-labelledby="review-queue"><h2 id="review-queue">Solicitudes por revisar</h2>{queue.length === 0 ? <p>No hay solicitudes pendientes.</p> : <ul className="application-list">{queue.map(item => <li key={item.id} className="application-list-item"><h3>{item.clinicName}</h3><p>{item.ownerEmail} · {item.phone}</p><p>{item.address}, {item.municipality}, {item.state} {item.postalCode}</p><p>Estado: {item.status}</p><label htmlFor={`reason-${item.id}`}>Motivo si se rechaza</label><input id={`reason-${item.id}`} maxLength={250} onChange={e => setForm({ ...form, [`reason-${item.id}`]: e.target.value })} /><button className="button button-primary" type="button" disabled={busy} onClick={() => void review(item.id, 'approve')}>Aprobar consultorio</button><button className="button" type="button" disabled={busy} onClick={() => void review(item.id, 'reject', form[`reason-${item.id}`] ?? '')}>Rechazar</button></li>)}</ul>}</section>}
  </section>;
}
