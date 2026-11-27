import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Receipt } from '../components/ui/Receipt';
import { Skeleton } from '../components/ui/Skeleton';
import { SlotButton } from '../components/ui/SlotButton';
import { api, ApiError } from '../services/api';
import { formatDateTime, formatTime, localToday, statusLabels } from '../lib/appointments';
import { formatPriceFrom } from '../lib/clinicPrice';
import type { AvailabilitySlot, Clinic } from '../types/api';


function requestMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 409) return 'Ese horario ya no está disponible. Elige otra opción.';
    if (cause.status === 401) return 'Tu sesión terminó. Inicia sesión para enviar la solicitud.';
    if (cause.status >= 500) {
      return 'El servicio tiene un problema temporal. Inténtalo de nuevo en unos minutos.';
    }
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error
    ? cause.message
    : 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

export function AppointmentRequestPage() {
  const { clinicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '';
  const { user, loading: authLoading, logout } = useAuth();

  const [clinic, setClinic] = useState<Clinic>();
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [clinicError, setClinicError] = useState('');
  const [clinicAttempt, setClinicAttempt] = useState(0);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(localToday());
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestResult, setRequestResult] = useState<{
    id: string;
    folio: string;
    status: string;
  }>();

  const serviceId = params.get('serviceId') ?? '';
  const dentistId = params.get('dentistId') ?? '';
  const selectedService = clinic?.services.find((service) => service.id === serviceId);
  const dentists = useMemo(
    () =>
      clinic?.dentists?.filter((dentist) =>
        dentist.services?.some((service) => service.id === serviceId),
      ) ?? [],
    [clinic, serviceId],
  );
  const selectedDentist = dentists.find((dentist) => dentist.id === dentistId);

  useEffect(() => {
    let active = true;
    setLoadingClinic(true);
    setClinicError('');
    setClinic(undefined);
    api
      .clinic(clinicId)
      .then(({ data }) => {
        if (active) setClinic(data);
      })
      .catch((cause: unknown) => {
        if (active) setClinicError(requestMessage(cause));
      })
      .finally(() => {
        if (active) setLoadingClinic(false);
      });
    return () => {
      active = false;
    };
  }, [clinicAttempt, clinicId]);

  useEffect(() => {
    if (
      !clinic ||
      !serviceId ||
      !dentistId ||
      !selectedService ||
      !selectedDentist ||
      !selectedDate
    ) {
      setSlots([]);
      setAvailabilityError('');
      setLoadingSlots(false);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    setAvailabilityError('');
    setSlots([]);
    setSelectedSlot('');
    setIdempotencyKey('');
    api
      .availability(clinicId, dentistId, serviceId, selectedDate)
      .then(({ data }) => {
        if (active) setSlots(data);
      })
      .catch((cause: unknown) => {
        if (active) setAvailabilityError(requestMessage(cause));
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [
    availabilityAttempt,
    clinic,
    clinicId,
    dentistId,
    selectedDate,
    selectedDentist,
    selectedService,
    serviceId,
  ]);

  function changeService(next: string) {
    const nextParams = new URLSearchParams();
    if (next) nextParams.set('serviceId', next);
    setParams(nextParams);
    setSelectedSlot('');
    setIdempotencyKey('');
    setRequestError('');
    setRequestResult(undefined);
  }

  function changeDentist(next: string) {
    const nextParams = new URLSearchParams();
    if (serviceId) nextParams.set('serviceId', serviceId);
    if (next) nextParams.set('dentistId', next);
    setParams(nextParams);
    setSelectedSlot('');
    setIdempotencyKey('');
    setRequestError('');
    setRequestResult(undefined);
  }

  function chooseSlot(slot: AvailabilitySlot) {
    if (slot.startsAt !== selectedSlot) {
      setIdempotencyKey(crypto.randomUUID());
    }
    setSelectedSlot(slot.startsAt);
    setRequestError('');
    setRequestResult(undefined);
  }

  async function submitRequest() {
    if (requesting || !user || !selectedSlot || !serviceId || !dentistId) return;
    setRequesting(true);
    setRequestError('');
    try {
      const result = await api.createAppointment(
        { clinicId, dentistId, dentalServiceId: serviceId, startsAt: selectedSlot },
        idempotencyKey || crypto.randomUUID(),
      );
      setRequestResult({
        id: result.data.id,
        folio: result.data.folio,
        status: result.data.status,
      });
    } catch (cause) {
      setRequestError(requestMessage(cause));
      if (cause instanceof ApiError && cause.status === 401) void logout();
    } finally {
      setRequesting(false);
    }
  }

  if (loadingClinic) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando consultorio…</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (clinicError || !clinic) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Notice tone="error" title="No pudimos cargar el consultorio">
          <p>{clinicError || 'El consultorio no está disponible.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-danger/40 text-danger-text hover:bg-danger/5"
              onClick={() => setClinicAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
            <Link
              className="inline-flex min-h-10 items-center px-3 text-sm font-semibold text-heading underline underline-offset-4"
              to="/clinics"
            >
              Volver al directorio
            </Link>
          </div>
        </Notice>
      </main>
    );
  }

  const canChooseDentist = Boolean(serviceId);
  const canChooseDate = Boolean(dentistId);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <nav aria-label="Migas de pan" className="text-sm font-semibold">
        <Link
          className="text-accent-strong underline-offset-4 hover:underline"
          to={`/clinics/${clinic.id}`}
          state={from ? { from } : undefined}
        >
          Volver a {clinic.name}
        </Link>
      </nav>

      <PageHeader
        className="mt-4"
        title="Solicitar atención"
        description="Elige un servicio, un dentista y un horario. Enviar la solicitud no confirma ni cobra la cita; el consultorio debe revisarla."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <ol className="grid gap-6">
          <li className="border-t border-line pt-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-accent-strong" aria-hidden="true">
                01
              </span>
              <h2 className="font-display text-xl font-semibold text-heading">
                Selecciona el servicio
              </h2>
            </div>
            <Field id="service-select" label="Servicio de interés" className="mt-4">
              <select
                id="service-select"
                value={serviceId}
                onChange={(event) => changeService(event.target.value)}
                className={controlClass}
              >
                <option value="">Elige un servicio</option>
                {clinic.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · Desde {formatPriceFrom(service.priceFrom)}
                  </option>
                ))}
              </select>
            </Field>
          </li>

          <li className={`border-t border-line pt-5 ${canChooseDentist ? '' : 'opacity-60'}`}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-accent-strong" aria-hidden="true">
                02
              </span>
              <h2 className="font-display text-xl font-semibold text-heading">
                Elige a tu especialista
              </h2>
            </div>
            <Field id="dentist-select" label="Especialista" className="mt-4">
              <select
                id="dentist-select"
                value={dentistId}
                onChange={(event) => changeDentist(event.target.value)}
                disabled={!canChooseDentist}
                className={controlClass}
              >
                <option value="">Selecciona un dentista</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.firstName} {dentist.lastName}
                  </option>
                ))}
              </select>
            </Field>
            {canChooseDentist && dentists.length === 0 && (
              <Notice tone="info" className="mt-3">
                No hay especialistas publicados para este servicio.
              </Notice>
            )}
          </li>

          <li className={`border-t border-line pt-5 ${canChooseDate ? '' : 'opacity-60'}`}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-accent-strong" aria-hidden="true">
                03
              </span>
              <h2 className="font-display text-xl font-semibold text-heading">
                Selecciona fecha y hora
              </h2>
            </div>
            <Field id="date-input" label="Fecha de atención" className="mt-4 max-w-sm">
              <input
                id="date-input"
                type="date"
                required
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSlot('');
                  setIdempotencyKey('');
                  setRequestResult(undefined);
                }}
                min={localToday()}
                disabled={!canChooseDate}
                className={controlClass}
              />
            </Field>
            <p className="mt-2 text-xs text-subtle">Zona horaria: Ciudad de México.</p>

            {loadingSlots && (
              <div className="mt-4" role="status" aria-live="polite">
                <p className="text-sm text-muted">Consultando horarios disponibles…</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              </div>
            )}

            {!loadingSlots && availabilityError && (
              <Notice tone="error" className="mt-4">
                <p>{availabilityError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-danger/40 text-danger-text hover:bg-danger/5"
                  onClick={() => setAvailabilityAttempt((current) => current + 1)}
                >
                  Reintentar horarios
                </Button>
              </Notice>
            )}

            {!loadingSlots && !availabilityError && canChooseDate && slots.length === 0 && (
              <Notice tone="info" className="mt-4">
                No hay horarios disponibles para esta fecha. Elige otro día para consultar más
                opciones.
              </Notice>
            )}

            {!loadingSlots && !availabilityError && slots.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <SlotButton
                    key={slot.startsAt}
                    selected={selectedSlot === slot.startsAt}
                    aria-label={`${formatDateTime(slot.startsAt)} a ${formatTime(slot.endsAt)}`}
                    onClick={() => chooseSlot(slot)}
                  >
                    {formatTime(slot.startsAt)}
                  </SlotButton>
                ))}
              </div>
            )}
          </li>

          <li className="border-t border-line pt-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-accent-strong" aria-hidden="true">
                04
              </span>
              <h2 className="font-display text-xl font-semibold text-heading">Tus datos</h2>
            </div>
            {authLoading ? (
              <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">
                Verificando tu sesión…
              </p>
            ) : user ? (
              <p className="mt-3 text-sm text-ink">
                <strong className="font-semibold text-heading">
                  {user.firstName} {user.lastName}
                </strong>
                <span className="text-muted"> · {user.email}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Inicia sesión para enviar la solicitud con los datos de tu cuenta.
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Usaremos los datos de tu cuenta para contactarte sobre esta solicitud.
            </p>
          </li>
        </ol>

        <aside className="lg:sticky lg:top-24">
          <section aria-label="Resumen de la solicitud">
            <Receipt
              title="Resumen de solicitud"
              rows={[
                { label: 'Consultorio', value: clinic.name },
                { label: 'Servicio', value: selectedService?.name ?? 'Por seleccionar' },
                {
                  label: 'Especialista',
                  value: selectedDentist
                    ? `${selectedDentist.firstName} ${selectedDentist.lastName}`
                    : 'Por seleccionar',
                },
                {
                  label: 'Fecha y hora',
                  value: selectedSlot ? formatDateTime(selectedSlot) : 'Por seleccionar',
                },
                {
                  label: 'Paciente',
                  value: user ? `${user.firstName} ${user.lastName}` : 'Por iniciar sesión',
                },
              ]}
              footer={
                <div>
                  {requestError && (
                    <Notice tone="error" className="mb-4">
                      {requestError}
                    </Notice>
                  )}

                  {authLoading ? (
                    <p className="text-sm text-muted" role="status" aria-live="polite">
                      Verificando tu sesión…
                    </p>
                  ) : !user ? (
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong focus-visible:ring-4 focus-visible:ring-accent"
                      to="/iniciar-sesion"
                      state={{ from: `${location.pathname}${location.search}` }}
                    >
                      Inicia sesión para agendar
                    </Link>
                  ) : requestResult ? (
                    <Notice tone="success" title="Solicitud enviada" className="mb-3">
                      <p>
                        Folio <strong>{requestResult.folio}</strong> · estado{' '}
                        <strong>
                          {statusLabels[requestResult.status?.toUpperCase()] ?? requestResult.status}
                        </strong>
                      </p>
                      <Link
                        className="mt-2 inline-block font-semibold text-accent-strong underline underline-offset-4"
                        to={`/mi-solicitud/?appointmentId=${encodeURIComponent(requestResult.id)}`}
                      >
                        Ver el estado de mi solicitud
                      </Link>
                    </Notice>
                  ) : (
                    <Button
                      variant="coral"
                      className="w-full"
                      loading={requesting}
                      disabled={!selectedSlot}
                      onClick={() => void submitRequest()}
                    >
                      {requesting ? 'Enviando solicitud…' : 'Enviar solicitud'}
                    </Button>
                  )}

                  <p className="mt-4 text-xs leading-relaxed text-muted">
                    Enviar la solicitud no confirma la cita. El consultorio revisará el horario y
                    te responderá.
                  </p>
                </div>
              }
            />
          </section>
        </aside>
      </div>
    </main>
  );
}
