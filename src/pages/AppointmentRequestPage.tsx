import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import {
  formatDateTime,
  formatTime,
  localToday,
  statusLabels,
} from '../lib/appointments';
import type { AvailabilitySlot, Clinic } from '../types/api';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

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
  const { user, loading: authLoading } = useAuth();

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
    if (!clinic || !serviceId || !dentistId || !selectedService || !selectedDentist) {
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
    setSelectedSlot(slot.startsAt);
    setIdempotencyKey(crypto.randomUUID());
    setRequestError('');
    setRequestResult(undefined);
  }

  async function submitRequest() {
    if (!user || !selectedSlot || !serviceId || !dentistId) return;
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
              className="border-danger/40 text-danger hover:bg-danger/5"
              onClick={() => setClinicAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
            <Link className="inline-flex min-h-10 items-center px-3 text-sm font-semibold text-brand underline underline-offset-4" to="/clinics">
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <nav aria-label="Migas de pan" className="text-sm font-semibold">
        <Link
          className="text-accent-strong underline-offset-4 hover:underline"
          to={`/clinics/${clinic.id}`}
        >
          Volver a {clinic.name}
        </Link>
      </nav>

      <header className="mt-4 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
          Solicitar atención
        </h1>
        <p className="mt-2 leading-relaxed text-muted">
          Elige un servicio, un dentista y un horario. Enviar la solicitud no confirma ni cobra la
          cita; el consultorio debe revisarla.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <ol className="grid gap-4">
          <li className="rounded-card border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
                1
              </span>
              <h2 className="font-display text-xl font-semibold text-brand">Selecciona el servicio</h2>
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-ink" htmlFor="service-select">
              Servicio de interés
              <select
                id="service-select"
                value={serviceId}
                onChange={(event) => changeService(event.target.value)}
                className="min-h-11 rounded-control border border-line-strong bg-white px-3 text-base font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              >
                <option value="">Elige un servicio</option>
                {clinic.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · Desde {money.format(service.priceFrom)}
                  </option>
                ))}
              </select>
            </label>
          </li>

          <li className={`rounded-card border border-line bg-white p-5 shadow-sm ${canChooseDentist ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
                2
              </span>
              <h2 className="font-display text-xl font-semibold text-brand">Elige a tu especialista</h2>
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-ink" htmlFor="dentist-select">
              Especialista
              <select
                id="dentist-select"
                value={dentistId}
                onChange={(event) => changeDentist(event.target.value)}
                disabled={!canChooseDentist}
                className="min-h-11 rounded-control border border-line-strong bg-white px-3 text-base font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona un dentista</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.firstName} {dentist.lastName}
                  </option>
                ))}
              </select>
            </label>
            {canChooseDentist && dentists.length === 0 && (
              <Notice tone="info" className="mt-3">
                No hay especialistas publicados para este servicio.
              </Notice>
            )}
          </li>

          <li className={`rounded-card border border-line bg-white p-5 shadow-sm ${canChooseDate ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
                3
              </span>
              <h2 className="font-display text-xl font-semibold text-brand">Selecciona fecha y hora</h2>
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-ink" htmlFor="date-input">
              Fecha de atención
              <input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSlot('');
                  setIdempotencyKey('');
                  setRequestResult(undefined);
                }}
                min={localToday()}
                disabled={!canChooseDate}
                className="min-h-11 max-w-sm rounded-control border border-line-strong bg-white px-3 text-base font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-not-allowed"
              />
            </label>

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
                  className="mt-3 border-danger/40 text-danger hover:bg-danger/5"
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
                  <button
                    key={slot.startsAt}
                    type="button"
                    aria-pressed={selectedSlot === slot.startsAt}
                    aria-label={`${formatDateTime(slot.startsAt)} a ${formatTime(slot.endsAt)}`}
                    onClick={() => chooseSlot(slot)}
                    className={`min-h-11 rounded-control border px-2 text-sm font-semibold transition-colors ${
                      selectedSlot === slot.startsAt
                        ? 'border-brand bg-brand text-white'
                        : 'border-line-strong bg-white text-brand hover:border-accent hover:bg-canvas'
                    }`}
                  >
                    {formatTime(slot.startsAt)}
                  </button>
                ))}
              </div>
            )}
          </li>
        </ol>

        <aside className="rounded-card border border-line bg-white shadow-md lg:sticky lg:top-24" aria-labelledby="summary-title">
          <div className="rounded-t-card bg-brand p-5 text-white">
            <h2 id="summary-title" className="font-display text-xl font-semibold">
              Resumen de solicitud
            </h2>
          </div>
          <dl className="grid gap-4 border-b border-dashed border-line p-5 text-sm">
            <div>
              <dt className="font-semibold text-muted">Consultorio</dt>
              <dd className="mt-1 font-semibold text-ink">{clinic.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Servicio</dt>
              <dd className="mt-1 font-semibold text-ink">{selectedService?.name ?? 'Por seleccionar'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Especialista</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedDentist ? `${selectedDentist.firstName} ${selectedDentist.lastName}` : 'Por seleccionar'}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Fecha y hora</dt>
              <dd className="mt-1 font-semibold text-ink">
                {selectedSlot ? formatDateTime(selectedSlot) : 'Por seleccionar'}
              </dd>
            </div>
          </dl>

          <div className="p-5">
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
                className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong focus-visible:ring-4 focus-visible:ring-accent/30"
                to="/iniciar-sesion"
              >
                Inicia sesión para agendar
              </Link>
            ) : requestResult ? (
              <Notice tone="success" title="Solicitud enviada" className="mb-3">
                <p>
                  Folio <strong>{requestResult.folio}</strong> · estado{' '}
                  <strong>{statusLabels[requestResult.status?.toUpperCase()] ?? requestResult.status}</strong>
                </p>
                <Link
                  className="mt-2 inline-block font-semibold text-accent-strong underline underline-offset-4"
                  to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`}
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
              Enviar la solicitud no confirma la cita. El consultorio revisará el horario y te
              responderá.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
