import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
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
  const [pushState, setPushState] = useState<
    'loading' | 'unsupported' | 'unconfigured' | 'disabled' | 'enabled' | 'working' | 'error'
  >('loading');
  const [pushMessage, setPushMessage] = useState('');
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

  useEffect(() => {
    let active = true;
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState('unsupported');
      return;
    }
    void Promise.all([
      api.pushConfig(),
      api.pushSubscriptionStatus(),
      navigator.serviceWorker.register('/sw.js'),
    ])
      .then(async ([config, serverStatus, registration]) => {
        if (!active) return;
        if (!config.data.configured || !config.data.publicKey) {
          setPushState('unconfigured');
          return;
        }
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          if (!serverStatus.data.enabled) {
            await api.savePushSubscription(subscription.toJSON() as {
              endpoint: string;
              keys: { p256dh: string; auth: string };
            });
          }
          setPushState('enabled');
        } else {
          setPushState('disabled');
        }
      })
      .catch(() => {
        if (active) setPushState('error');
      });
    return () => {
      active = false;
    };
  }, [user]);

  const togglePush = async () => {
    if (!user || pushState === 'working') return;
    setPushState('working');
    setPushMessage('');
    try {
      const config = await api.pushConfig();
      if (!config.data.configured || !config.data.publicKey) {
        setPushState('unconfigured');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await api.removePushSubscription(current.endpoint);
        await current.unsubscribe();
        setPushState('disabled');
        setPushMessage('Notificaciones desactivadas en este dispositivo.');
        return;
      }
      const permission =
        Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setPushState('disabled');
        setPushMessage('El permiso no está activo. Puedes habilitarlo en la configuración del navegador.');
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.data.publicKey),
      });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        await subscription.unsubscribe();
        throw new Error('El navegador no devolvió una suscripción válida.');
      }
      await api.savePushSubscription({
        endpoint: serialized.endpoint,
        keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
      });
      setPushState('enabled');
      setPushMessage('Recibirás avisos de tus citas en este dispositivo.');
    } catch (cause) {
      setPushState('error');
      setPushMessage(cause instanceof Error ? cause.message : 'No fue posible configurar las notificaciones.');
    }
  };

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
        <section className="rounded-panel border border-line bg-surface p-6">
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
      <PageHeader
        kicker={clinicMode ? 'Consultorio' : 'Mi cuenta'}
        title="Avisos"
        actions={
          <>
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
          </>
        }
      />
      <p className="mt-2 text-sm text-muted" aria-live="polite" hidden={loading || Boolean(error)}>
        {unreadCount === 0
          ? 'Estás al día.'
          : `${unreadCount} ${unreadCount === 1 ? 'aviso sin leer' : 'avisos sin leer'}`}
      </p>

      <section className="mt-5 rounded-panel border border-line bg-surface p-4 sm:p-5" aria-labelledby="push-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="push-title" className="font-semibold text-heading">Avisos en este dispositivo</h2>
            <p className="mt-1 text-sm text-muted">
              Recibe cambios de tus citas aunque DentalConnect no esté abierto.
            </p>
          </div>
          {pushState !== 'unsupported' && pushState !== 'unconfigured' && (
            <button
              type="button"
              className={buttonStyles(pushState === 'enabled' ? 'outline' : 'primary', 'sm')}
              disabled={pushState === 'loading' || pushState === 'working' || authLoading}
              onClick={() => void togglePush()}
            >
              {pushState === 'loading' || pushState === 'working'
                ? 'Configurando…'
                : pushState === 'enabled'
                  ? 'Desactivar avisos'
                  : 'Activar avisos'}
            </button>
          )}
        </div>
        {pushState === 'unconfigured' && (
          <p className="mt-3 text-sm text-muted" role="status">
            Las notificaciones push aún no están configuradas en el servicio.
          </p>
        )}
        {pushState === 'unsupported' && (
          <p className="mt-3 text-sm text-muted" role="status">
            Este navegador no admite notificaciones push. Tus avisos seguirán disponibles aquí.
          </p>
        )}
        {pushState === 'error' && (
          <p className="mt-3 text-sm text-danger-text" role="alert">
            {pushMessage || 'No pudimos consultar el estado de las notificaciones.'}
          </p>
        )}
        {pushMessage && pushState !== 'error' && (
          <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">{pushMessage}</p>
        )}
      </section>

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
        <ul
          className="mt-6 divide-y divide-line border-y border-line"
          aria-label="Avisos de citas"
        >
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`py-5 ${notification.isRead ? '' : 'border-l-2 border-accent pl-4'}`}
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
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-strong">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}
