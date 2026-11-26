import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Section } from '../components/ui/Section';
import { Skeleton } from '../components/ui/Skeleton';
import { AdminShell } from '../components/layout/AdminShell';
import { isClinicAdmin } from '../lib/roles';
import { clinicRequest } from '../services/clinicApi';

type ClinicProfile = { id: string; name: string; description: string; phone: string; email: string; address: string; municipality: string; state: string; postalCode: string; imageUrl: string | null; latitude: number | null; longitude: number | null; isActive: boolean };
type ServiceOffering = { id: string; name: string; description: string; estimatedDurationMinutes: number; isOffered: boolean; priceFrom: number | null };
type SettingsResponse = { data: { clinic: ClinicProfile; services: ServiceOffering[] } };
type OwnClinicResponse = { data: { clinicId: string; name: string } };

export function ClinicSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [clinicId, setClinicId] = useState('');
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [serviceDraft, setServiceDraft] = useState({ name: '', description: '', estimatedDurationMinutes: 30, priceFrom: 0 });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const own = await clinicRequest<OwnClinicResponse>('/clinics/mine');
      const id = own.data.clinicId;
      setClinicId(id);
      const result = await clinicRequest<SettingsResponse>('/clinics/' + encodeURIComponent(id) + '/management');
      setClinic(result.data.clinic); setServices(result.data.services);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el consultorio.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user && isClinicAdmin(user.role)) void load(); else if (!authLoading) setLoading(false); }, [authLoading, load, user]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!clinic || !clinicId) return;
    setSaving(true); setError('');
    try {
      const result = await clinicRequest<{ data: ClinicProfile }>('/clinics/' + encodeURIComponent(clinicId) + '/management', {
        method: 'PUT', body: JSON.stringify({ ...clinic, latitude: clinic.latitude ?? null, longitude: clinic.longitude ?? null }),
      });
      setClinic(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el consultorio.'); }
    finally { setSaving(false); }
  };  const uploadClinicImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !clinic || !clinicId) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Elige una imagen PNG, JPEG o WebP de hasta 5 MB.');
      input.value = '';
      return;
    }
    setUploadingImage(true); setError('');
    try {
      const body = new FormData(); body.append('file', file);
      const result = await clinicRequest<{ data: { imageUrl: string } }>('/clinics/' + encodeURIComponent(clinicId) + '/management/image', { method: 'POST', body });
      setClinic({ ...clinic, imageUrl: result.data.imageUrl });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la imagen.'); }
    finally { setUploadingImage(false); input.value = ''; }
  };



  const saveService = async (service: ServiceOffering) => {
    if (!clinicId) return;
    setSaving(true); setError('');
    try {
      await clinicRequest('/clinics/' + encodeURIComponent(clinicId) + '/management/services/' + encodeURIComponent(service.id), {
        method: 'PUT', body: JSON.stringify({ isActive: service.isOffered, priceFrom: Number(service.priceFrom ?? 0) }),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el servicio.'); }
    finally { setSaving(false); }
  };

  const createService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clinicId) return;
    setCreatingService(true); setError('');
    try {
      await clinicRequest('/clinics/' + encodeURIComponent(clinicId) + '/management/services', {
        method: 'POST', body: JSON.stringify(serviceDraft),
      });
      setServiceDraft({ name: '', description: '', estimatedDurationMinutes: 30, priceFrom: 0 });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo agregar el servicio.'); }
    finally { setCreatingService(false); }
  };

  if (authLoading || loading) return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" role="status"><p className="sr-only">Cargando configuración…</p><Skeleton className="h-48 w-full" /></main>;
  if (!user) return <Navigate to="/iniciar-sesion" replace state={{ from: '/consultorio/configuracion' }} />;
  if (!isClinicAdmin(user.role)) return <main className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error" title="Acceso restringido">Solo una cuenta autorizada del consultorio puede cambiar estos datos.</Notice></main>;

  return (
    <AdminShell
      title="Perfil y servicios"
      description="Actualiza la información que ven los pacientes."
      clinicName={clinic?.name}
      active="profile"
    >
      {error && (
        <Notice tone="error" title="No se completó la operación" className="mb-5">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            Reintentar
          </Button>
        </Notice>
      )}
      {!clinic && !error && (
        <Notice tone="info" title="Consultorio no vinculado">
          Tu cuenta debe estar aprobada y asociada a un consultorio antes de administrar su perfil.
        </Notice>
      )}

      {clinic && (
        <div className="grid gap-8">
          <Section title="Información pública">
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <Field id="clinic-name" label="Nombre">
                <input
                  required
                  maxLength={120}
                  value={clinic.name}
                  onChange={(event) => setClinic({ ...clinic, name: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-email" label="Correo de contacto">
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={clinic.email}
                  onChange={(event) => setClinic({ ...clinic, email: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-phone" label="Teléfono">
                <input
                  required
                  maxLength={30}
                  value={clinic.phone}
                  onChange={(event) => setClinic({ ...clinic, phone: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-address" label="Dirección">
                <input
                  required
                  maxLength={250}
                  value={clinic.address}
                  onChange={(event) => setClinic({ ...clinic, address: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-municipality" label="Municipio">
                <input
                  required
                  maxLength={100}
                  value={clinic.municipality}
                  onChange={(event) => setClinic({ ...clinic, municipality: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-state" label="Estado">
                <input
                  required
                  maxLength={100}
                  value={clinic.state}
                  onChange={(event) => setClinic({ ...clinic, state: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-postalCode" label="Código postal">
                <input
                  required
                  maxLength={20}
                  value={clinic.postalCode}
                  onChange={(event) => setClinic({ ...clinic, postalCode: event.target.value })}
                  className={controlClass}
                />
              </Field>
              <Field id="clinic-description" label="Descripción" className="sm:col-span-2">
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={clinic.description}
                  onChange={(event) => setClinic({ ...clinic, description: event.target.value })}
                  className={controlClass}
                />
              </Field>

              <div className="grid gap-2 sm:col-span-2">
                <Field id="clinic-image" label="Imagen del consultorio (PNG, JPEG o WebP; hasta 5 MB)">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingImage}
                    onChange={uploadClinicImage}
                    className={controlClass}
                  />
                </Field>
                {uploadingImage && (
                  <p role="status" className="text-sm text-muted">
                    Subiendo imagen…
                  </p>
                )}
                {clinic.imageUrl && (
                  <img
                    src={clinic.imageUrl}
                    alt="Imagen actual del consultorio"
                    className="max-h-56 w-full rounded-card object-cover"
                  />
                )}
                <Field id="clinic-image-url" label="URL alternativa de imagen">
                  <input
                    type="url"
                    maxLength={2048}
                    placeholder="https://…"
                    value={clinic.imageUrl ?? ''}
                    onChange={(event) =>
                      setClinic({ ...clinic, imageUrl: event.target.value || null })
                    }
                    className={controlClass}
                  />
                </Field>
                <p className="text-xs text-muted">
                  La URL se guarda en el perfil; las cargas de archivo se almacenan en AWS.
                </p>
              </div>

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Field id="clinic-latitude" label="Latitud">
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={clinic.latitude ?? ''}
                    onChange={(event) =>
                      setClinic({
                        ...clinic,
                        latitude: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                    className={controlClass}
                  />
                </Field>
                <Field id="clinic-longitude" label="Longitud">
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={clinic.longitude ?? ''}
                    onChange={(event) =>
                      setClinic({
                        ...clinic,
                        longitude: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                    className={controlClass}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving} loading={saving}>
                  Guardar perfil
                </Button>
              </div>
            </form>
          </Section>

          <Section
            title="Servicios del consultorio"
            description="Activa los servicios que ofreces. La duración sirve para calcular horarios completos disponibles."
          >
            <form
              onSubmit={createService}
              className="grid gap-3 rounded-panel border border-line bg-canvas p-4 sm:grid-cols-2"
              aria-label="Agregar servicio personalizado"
            >
              <h3 className="font-semibold text-heading sm:col-span-2">Agregar servicio</h3>
              <Field id="service-name" label="Nombre">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={serviceDraft.name}
                  onChange={(event) =>
                    setServiceDraft({ ...serviceDraft, name: event.target.value })
                  }
                  className={controlClass}
                />
              </Field>
              <Field id="service-duration" label="Duración en minutos">
                <input
                  required
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={serviceDraft.estimatedDurationMinutes}
                  onChange={(event) =>
                    setServiceDraft({
                      ...serviceDraft,
                      estimatedDurationMinutes: Number(event.target.value),
                    })
                  }
                  className={controlClass}
                />
              </Field>
              <Field id="service-description" label="Descripción">
                <textarea
                  required
                  maxLength={500}
                  rows={2}
                  value={serviceDraft.description}
                  onChange={(event) =>
                    setServiceDraft({ ...serviceDraft, description: event.target.value })
                  }
                  className={controlClass}
                />
              </Field>
              <Field id="service-price" label="Precio inicial">
                <input
                  required
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  value={serviceDraft.priceFrom}
                  onChange={(event) =>
                    setServiceDraft({ ...serviceDraft, priceFrom: Number(event.target.value) })
                  }
                  className={controlClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creatingService} loading={creatingService}>
                  Agregar servicio
                </Button>
              </div>
            </form>

            {services.length === 0 ? (
              <Notice tone="info" className="mt-4">
                No hay servicios disponibles en el catálogo.
              </Notice>
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-heading">{service.name}</h3>
                      <p className="text-sm text-muted">
                        {service.description} · {service.estimatedDurationMinutes} min
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={service.isOffered}
                        onChange={(event) =>
                          setServices((items) =>
                            items.map((item) =>
                              item.id === service.id
                                ? { ...item, isOffered: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Ofrecido
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={'service-price-' + service.id}>
                        Precio inicial
                      </label>
                      <span aria-hidden="true">$</span>
                      <input
                        id={'service-price-' + service.id}
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.01"
                        value={service.priceFrom ?? 0}
                        onChange={(event) =>
                          setServices((items) =>
                            items.map((item) =>
                              item.id === service.id
                                ? { ...item, priceFrom: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                        className={`${controlClass} w-28`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => void saveService(service)}
                      >
                        Guardar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </AdminShell>
  );
}
