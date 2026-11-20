import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { buttonStyles } from '../components/ui/Button';
import { isClinicAdmin } from '../lib/roles';
import { api, ApiError } from '../services/api';
import type { UserNotification } from '../types/api';

const receivedDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401)
    return 'El API rechazó la consulta (401). Tu sesión sigue abierta; vuelve a intentarlo. Si persiste, el acceso de esta cuenta necesita revisión.';
  if (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch|network|load failed/i.test(error.message))
  ) {
    return 'No pudimos conectar con tus avisos. Revisa tu conexión e inténtalo de nuevo.';
  }
  return error instanceof Error ? error.message : 'No fue posible cargar tus avisos.';
}

export function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const clinicMode = isClinicAdmin(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.notifications();
      setNotifications(result.data);
      setUnreadCount(result.unreadCount);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [attempt, load, user]);

  const markRead = async (notification: UserNotification) => {
    setBusy(true);
    setError('');
    try {
      await api.markNotificationRead(notification.id);
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    setError('');
    try {
      await api.markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true, readAt: now })));
      setUnreadCount(0);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando sesión…</p>
        <Skeleton className="h-36 w-full" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-accent-strong">DentalConnect</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-heading">Avisos</h1>
          <Notice tone="info" className="mt-4">
            Inicia sesión para consultar los avisos de tus solicitudes y citas.
          </Notice>
          <Link className={`${buttonStyles('primary', 'md')} mt-4`} to="/iniciar-sesion">
            Iniciar sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-semibold text-accent-strong">
            {clinicMode ? 'Consultorio' : 'Mi cuenta'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-heading">Avisos</h1>
          <p className="mt-2 text-muted" aria-live="polite">
            {unreadCount === 0
              ? 'Estás al día.'
              : `${unreadCount} ${unreadCount === 1 ? 'aviso sin leer' : 'avisos sin leer'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              className={buttonStyles('outline', 'sm')}
              disabled={busy}
              onClick={() => void markAllRead()}
            >
              Marcar todos como leídos
            </button>
          )}
          <Link
            className={buttonStyles('outline', 'sm')}
            to={clinicMode ? '/administrar-solicitudes' : '/mis-citas'}
          >
            {clinicMode ? 'Ver solicitudes' : 'Ver mis citas'}
          </Link>
        </div>
      </header>

      {loading && (
        <div className="mt-6 grid gap-3" role="status" aria-live="polite">
          <p className="sr-only">Cargando avisos…</p>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {!loading && error && (
        <Notice tone="error" title="No pudimos cargar tus avisos" className="mt-6">
          <p>{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold underline underline-offset-4"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Reintentar
          </button>
        </Notice>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Notice tone="info" className="mt-6">
          Cuando cambie el estado de una solicitud, aparecerá aquí.
        </Notice>
      )}

      {!loading && !error && notifications.length > 0 && (
        <ul className="mt-6 grid gap-3" aria-label="Avisos de citas">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-card border bg-surface p-5 shadow-sm ${notification.isRead ? 'border-line' : 'border-accent/50'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-heading">{notification.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{notification.message}</p>
                  <time className="mt-2 block text-xs text-muted" dateTime={notification.createdAt}>
                    {receivedDate(notification.createdAt)}
                  </time>
                </div>
                {!notification.isRead && (
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong">
                    Sin leer
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className={buttonStyles('primary', 'sm')}
                  to={
                    clinicMode
                      ? `/administrar-solicitudes?appointmentId=${encodeURIComponent(notification.appointmentId)}`
                      : `/mi-solicitud/?appointmentId=${encodeURIComponent(notification.appointmentId)}`
                  }
                >
                  {clinicMode ? 'Revisar solicitud' : 'Ver solicitud'}
                </Link>
                {!notification.isRead && (
                  <button
                    type="button"
                    className={buttonStyles('outline', 'sm')}
                    disabled={busy}
                    onClick={() => void markRead(notification)}
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
