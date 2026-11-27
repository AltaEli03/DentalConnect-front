import { type FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { isClinicAdmin } from '../lib/roles';
import { AdminShell } from '../components/layout/AdminShell';
import { api } from '../services/api';
import { clinicRequest } from '../services/clinicApi';

type Dentist = { id: string; firstName: string; lastName: string; professionalLicense: string; specialty: string; biography: string; imageUrl?: string | null; isActive: boolean; services?: Array<{ id: string; name: string }> };
type Weekly = { id: string; dayOfWeek: number; startsAt: string; endsAt: string; breakStartsAt?: string | null; breakEndsAt?: string | null };
type Block = { id: string; startsAt: string; endsAt: string; reason?: string | null };
type DentalService = { id: string; name: string };
type OwnClinic = { data: { clinicId: string; name: string } };
type DentistList = { data: Dentist[] };
const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
type ManagementSection = 'team' | 'schedule';
const emptyDentist = { firstName: '', lastName: '', professionalLicense: '', specialty: '', biography: '', imageUrl: '', dentalServiceIds: [] as string[] };
const toApiTime = (value: string) => (value.length === 5 ? `${value}:00` : value);

export function DentistManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const [clinicId, setClinicId] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dentists, setDentists] = useState<Dentist[]>([]); 
  const [services, setServices] = useState<DentalService[]>([]); 
  const [selected, setSelected] = useState(''); 
  const [scheduleDentistId, setScheduleDentistId] = useState('');
  const [activeSection, setActiveSection] = useState<ManagementSection>('team');
  const [weekly, setWeekly] = useState<Weekly[]>([]); 
  const [blocks, setBlocks] = useState<Block[]>([]); 
  const [form, setForm] = useState(emptyDentist);
  
  const [day, setDay] = useState('1'); 
  const [starts, setStarts] = useState('09:00'); 
  const [ends, setEnds] = useState('18:00'); 
  const [breakStart, setBreakStart] = useState(''); 
  const [breakEnd, setBreakEnd] = useState(''); 
  const [blockStart, setBlockStart] = useState(''); 
  const [blockEnd, setBlockEnd] = useState(''); 
  const [blockReason, setBlockReason] = useState(''); 
  const [message, setMessage] = useState('');   const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);

  const call = clinicRequest;

  async function loadDentists(id = clinicId) { 
    if (!id.trim()) return; 
    const result = await call<DentistList>('/clinics/' + encodeURIComponent(id.trim()) + '/dentists'); 
    setDentists(result.data); 
    setServices((await api.clinic(id.trim())).data.services.map((s) => ({ id: s.id, name: s.name }))); 
  }
  
  async function loadSchedule(dentistId = scheduleDentistId) {
    if (!dentistId) return; 
    const path = '/clinics/' + encodeURIComponent(clinicId.trim()) + '/dentists/' + encodeURIComponent(dentistId); 
    const [s,b] = await Promise.all([call<{data:Weekly[]}>(path+'/schedule'),call<{data:Block[]}>(path+'/blocks')]); 
    setWeekly(s.data); 
    setBlocks(b.data); 
  }
  
  async function run(action: () => Promise<void>) { 
    setBusy(true); 
    setMessage(''); 
    try { await action(); } 
    catch (e) { setMessage(e instanceof Error ? e.message : 'Ocurrió un error.'); } 
    finally { setBusy(false); } 
  }
  
  useEffect(() => { if (scheduleDentistId) void run(() => loadSchedule(scheduleDentistId)); else { setWeekly([]); setBlocks([]); } }, [scheduleDentistId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isClinicAdmin(user.role)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadOwnClinic = async () => {
      setLoading(true);
      setMessage('');
      try {
        const own = await clinicRequest<OwnClinic>('/clinics/mine');
        const id = own.data.clinicId?.trim();
        if (!id) throw new Error('Tu cuenta aún no está vinculada a un consultorio aprobado.');

        const [dentistResult, clinicResult] = await Promise.all([
          clinicRequest<DentistList>('/clinics/' + encodeURIComponent(id) + '/dentists'),
          api.clinic(id),
        ]);
        if (cancelled) return;

        setClinicId(id);
        setClinicName(own.data.name);
        setDentists(dentistResult.data);
        setServices(clinicResult.data.services.map((service) => ({ id: service.id, name: service.name })));
      } catch (cause) {
        if (!cancelled) setMessage(cause instanceof Error ? cause.message : 'No se pudo cargar el consultorio de esta cuenta.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOwnClinic();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  function edit(d: Dentist) { 
    setSelected(d.id); 
    setForm({ firstName:d.firstName,lastName:d.lastName,professionalLicense:d.professionalLicense,specialty:d.specialty,biography:d.biography||'',imageUrl:d.imageUrl||'',dentalServiceIds:(d.services||[]).map(s=>s.id) }); 
  }

  async function saveDentist(e: FormEvent) { 
    e.preventDefault(); 
    await run(async()=>{ 
      const editing=Boolean(selected); 
      const saved=await call<{data:Dentist}>('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists'+(editing?'/'+encodeURIComponent(selected):''),{method:editing?'PUT':'POST',body:JSON.stringify(form)}); const dentistId=saved.data.id; setSelected(dentistId); if(imageFile){const body=new FormData();body.append('file',imageFile);await call('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(dentistId)+'/image',{method:'POST',body});} 
      setSelected(''); 
      setForm(emptyDentist); setImageFile(null); setImageInputKey(value=>value+1); 
      await loadDentists(); 
    }); 
  }

  async function toggle(d:Dentist) { 
    await run(async()=>{ 
      await call('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(d.id)+'/status',{method:'PATCH',body:JSON.stringify({isActive:!d.isActive})}); 
      if (d.isActive && scheduleDentistId === d.id) setScheduleDentistId('');
      await loadDentists(); 
    }); 
  }

  async function addWeekly(e:FormEvent) { 
    e.preventDefault(); 
    if(!scheduleDentistId)return;
    const start = toApiTime(starts);
    const end = toApiTime(ends);
    const restStart = breakStart ? toApiTime(breakStart) : null;
    const restEnd = breakEnd ? toApiTime(breakEnd) : null;
    if ((restStart === null) !== (restEnd === null)) {
      setMessage('Completa el inicio y fin del descanso, o deja ambos vacíos.');
      return;
    }
    if (starts >= ends) {
      setMessage('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    if (breakStart && breakEnd && (breakStart >= breakEnd || breakStart <= starts || breakEnd >= ends)) {
      setMessage('El descanso debe estar dentro de la jornada y tener un intervalo válido.');
      return;
    }
    await run(async()=>{ 
      const created = await call<{ data: Weekly }>('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(scheduleDentistId)+'/schedule',{method:'POST',body:JSON.stringify({dayOfWeek:Number(day),startsAt:start,endsAt:end,breakStartsAt:restStart,breakEndsAt:restEnd})});
      setWeekly(current => [...current.filter(item => item.id !== created.data.id), created.data].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startsAt.localeCompare(b.startsAt)));
    }); 
  }

  async function addBlock(e:FormEvent) { 
    e.preventDefault(); 
    if(!scheduleDentistId||!blockStart||!blockEnd)return;
    await run(async()=>{ 
      await call('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(scheduleDentistId)+'/blocks',{method:'POST',body:JSON.stringify({startsAt:new Date(blockStart).toISOString(),endsAt:new Date(blockEnd).toISOString(),reason:blockReason})});
      setBlockStart('');setBlockEnd('');setBlockReason('');await loadSchedule(); 
    }); 
  }

  const dentistPath='/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(scheduleDentistId);

  if (authLoading || loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" role="status"><p className="sr-only">Cargando el consultorio y su equipo…</p><Skeleton className="h-48 w-full" /></main>;
  }

  if (!user) return <Navigate to="/iniciar-sesion" replace state={{ from: '/administrar-dentistas' }} />;

  if (!isClinicAdmin(user.role)) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error" title="Acceso de consultorio">Esta sección solo está disponible para una cuenta administradora vinculada a una clínica.</Notice></main>;
  }

  return (
    <AdminShell
      title="Dentistas y horarios"
      description="Administra el equipo y la agenda desde secciones separadas."
      clinicName={clinicName}
      active="team"
    >
      {message && (
        <Notice tone="error" role="alert" className="mb-5">
          <p>{message}</p>
        </Notice>
      )}

      {clinicId && (
        <>
          <div className="flex flex-wrap gap-5" role="group" aria-label="Secciones de administración">
            <button
              type="button"
              aria-pressed={activeSection === 'team'}
              onClick={() => setActiveSection('team')}
              className={`inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold ${
                activeSection === 'team'
                  ? 'border-accent text-heading'
                  : 'border-transparent text-subtle hover:text-heading'
              }`}
            >
              Equipo dental
            </button>
            <button
              type="button"
              aria-pressed={activeSection === 'schedule'}
              disabled={dentists.every((d) => !d.isActive)}
              onClick={() => setActiveSection('schedule')}
              className={`inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                activeSection === 'schedule'
                  ? 'border-accent text-heading'
                  : 'border-transparent text-subtle hover:text-heading'
              }`}
            >
              Horarios
            </button>
          </div>

          {activeSection === 'team' && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <section className="rounded-panel border border-line bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <h2 className="font-display text-lg font-semibold text-heading">Dentistas</h2>
                  <span className="text-xs font-semibold text-subtle">{dentists.length}</span>
                </div>

                {dentists.length === 0 ? (
                  <p className="p-4 text-sm text-muted">
                    Aún no hay dentistas. Agrega el primero en el formulario.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {dentists.map((d) => (
                      <li
                        key={d.id}
                        className={`px-4 py-4 ${selected === d.id ? 'border-l-2 border-accent' : ''}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-display text-lg font-semibold text-heading">
                            {d.firstName} {d.lastName}
                          </h3>
                          <span
                            className={`inline-flex rounded-[4px] border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              d.isActive
                                ? 'border-success-border bg-success-soft text-success-text'
                                : 'border-line-strong bg-surface-soft text-subtle'
                            }`}
                          >
                            {d.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {d.specialty} · Céd. {d.professionalLicense}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {(d.services || []).map((service) => service.name).join(' • ') ||
                            'Sin servicios asignados'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => edit(d)}>
                            Editar perfil
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!d.isActive}
                            title={
                              !d.isActive ? 'Activa al dentista para configurar su agenda' : undefined
                            }
                            onClick={() => {
                              setScheduleDentistId(d.id);
                              setActiveSection('schedule');
                            }}
                          >
                            Horarios
                          </Button>
                          <Button
                            variant={d.isActive ? 'danger' : 'primary'}
                            size="sm"
                            onClick={() => void toggle(d)}
                          >
                            {d.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-panel border border-line bg-surface p-5">
                <h2 className="font-display text-lg font-semibold text-heading">
                  {selected ? 'Editar perfil' : 'Nuevo dentista'}
                </h2>
                <form onSubmit={saveDentist} className="mt-4 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="dentist-first-name" label="Nombre(s)">
                      <input
                        required
                        value={form.firstName}
                        onChange={(event) =>
                          setForm({ ...form, firstName: event.target.value })
                        }
                        className={controlClass}
                      />
                    </Field>
                    <Field id="dentist-last-name" label="Apellidos">
                      <input
                        required
                        value={form.lastName}
                        onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                        className={controlClass}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="dentist-license" label="Cédula profesional">
                      <input
                        required
                        value={form.professionalLicense}
                        onChange={(event) =>
                          setForm({ ...form, professionalLicense: event.target.value })
                        }
                        className={controlClass}
                      />
                    </Field>
                    <Field id="dentist-specialty" label="Especialidad">
                      <input
                        required
                        value={form.specialty}
                        onChange={(event) => setForm({ ...form, specialty: event.target.value })}
                        className={controlClass}
                      />
                    </Field>
                  </div>

                  <Field id="dentist-photo" label="Fotografía PNG/JPEG/WebP (máx. 5 MB)">
                    <input
                      key={imageInputKey}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0] ?? null;
                        if (
                          file &&
                          (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                            file.size > 5 * 1024 * 1024)
                        ) {
                          setMessage('Selecciona PNG, JPEG o WebP de hasta 5 MB.');
                          input.value = '';
                          return;
                        }
                        setImageFile(file);
                        setMessage('');
                      }}
                      className={controlClass}
                    />
                  </Field>
                  <p className="-mt-2 text-xs text-muted">
                    {imageFile
                      ? `Archivo seleccionado: ${imageFile.name}`
                      : 'La foto se carga al guardar.'}
                  </p>

                  <Field id="dentist-photo-url" label="URL de fotografía (opcional)">
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                      placeholder="https://..."
                      className={controlClass}
                    />
                  </Field>

                  <Field id="dentist-biography" label="Biografía">
                    <textarea
                      rows={4}
                      value={form.biography}
                      onChange={(event) => setForm({ ...form, biography: event.target.value })}
                      placeholder="Breve resumen profesional..."
                      className={controlClass}
                    />
                  </Field>

                  <fieldset className="rounded-control border border-line p-3">
                    <legend className="px-1 text-sm font-semibold text-heading">
                      Servicios que ofrece
                    </legend>
                    {services.length === 0 ? (
                      <p className="text-sm text-muted">
                        Aún no hay servicios. Agrégalos primero desde «Perfil y servicios».
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {services.map((service) => {
                          const checked = form.dentalServiceIds.includes(service.id);
                          return (
                            <label
                              key={service.id}
                              className={`inline-flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-sm ${
                                checked
                                  ? 'border-accent bg-surface-soft text-heading'
                                  : 'border-line text-ink'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    dentalServiceIds: event.target.checked
                                      ? [...form.dentalServiceIds, service.id]
                                      : form.dentalServiceIds.filter(
                                          (id) => id !== service.id,
                                        ),
                                  })
                                }
                              />
                              {service.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                  <p className="text-xs text-muted">
                    Para agregar o editar los servicios del consultorio, abre «Perfil y
                    servicios».
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy} loading={busy}>
                      {selected ? 'Guardar cambios' : 'Crear dentista'}
                    </Button>
                    {selected && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelected('');
                          setForm(emptyDentist);
                          setImageFile(null);
                          setImageInputKey((value) => value + 1);
                        }}
                      >
                        Cancelar edición
                      </Button>
                    )}
                  </div>
                </form>
              </section>
            </div>
          )}
        </>
      )}

      {clinicId && activeSection === 'schedule' && (
        <section className="mt-6 rounded-panel border border-line bg-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-heading">Agenda del equipo</h2>
              <p className="mt-1 text-sm text-muted">
                Configura jornadas semanales y bloqueos por fecha para un dentista.
              </p>
            </div>
            <Field id="schedule-dentist" label="Dentista" className="min-w-72">
              <select
                value={scheduleDentistId}
                onChange={(event) => setScheduleDentistId(event.target.value)}
                className={controlClass}
              >
                <option value="">Selecciona un dentista</option>
                {dentists
                  .filter((d) => d.isActive)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          {!scheduleDentistId ? (
            <p className="py-8 text-center text-sm text-muted">
              Selecciona un dentista activo para consultar o configurar su agenda.
            </p>
          ) : (
            <>
              <p className="mt-4 text-xs text-subtle">Zona horaria: Ciudad de México</p>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div className="rounded-control border border-line bg-canvas p-4">
                  <h3 className="font-display text-base font-semibold text-heading">
                    Horario semanal
                  </h3>
                  <form onSubmit={addWeekly} className="mt-3 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field id="weekly-day" label="Día">
                        <select
                          value={day}
                          onChange={(event) => setDay(event.target.value)}
                          className={controlClass}
                        >
                          {days.map((name, index) => (
                            <option key={name} value={index}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field id="weekly-start" label="Inicio">
                        <input
                          type="time"
                          required
                          value={starts}
                          onChange={(event) => setStarts(event.target.value)}
                          className={controlClass}
                        />
                      </Field>
                      <Field id="weekly-end" label="Fin">
                        <input
                          type="time"
                          required
                          value={ends}
                          onChange={(event) => setEnds(event.target.value)}
                          className={controlClass}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="break-start" label="Inicio descanso">
                        <input
                          type="time"
                          value={breakStart}
                          onChange={(event) => setBreakStart(event.target.value)}
                          className={controlClass}
                        />
                      </Field>
                      <Field id="break-end" label="Fin descanso">
                        <input
                          type="time"
                          value={breakEnd}
                          onChange={(event) => setBreakEnd(event.target.value)}
                          className={controlClass}
                        />
                      </Field>
                    </div>
                    <Button type="submit" disabled={busy}>
                      Añadir jornada
                    </Button>
                  </form>

                  <div className="mt-4 grid gap-2">
                    {weekly.length === 0 && (
                      <p className="rounded-control border border-dashed border-line p-3 text-sm text-muted">
                        Aún no hay jornadas. Agrega los días y horas en que atiende.
                      </p>
                    )}
                    {weekly.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-start justify-between gap-3 rounded-control border border-line bg-surface p-3 text-sm"
                      >
                        <div>
                          <strong className="block text-heading">
                            {days[schedule.dayOfWeek]}
                          </strong>
                          <span className="text-muted">
                            {String(schedule.startsAt).slice(0, 5)} -{' '}
                            {String(schedule.endsAt).slice(0, 5)}
                          </span>
                          {schedule.breakStartsAt && (
                            <small className="block text-muted">
                              Descanso: {String(schedule.breakStartsAt).slice(0, 5)} -{' '}
                              {String(schedule.breakEndsAt).slice(0, 5)}
                            </small>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Eliminar jornada del ${days[schedule.dayOfWeek]}`}
                          onClick={() =>
                            void run(async () => {
                              await call(dentistPath + '/schedule/' + schedule.id, {
                                method: 'DELETE',
                              });
                              await loadSchedule(scheduleDentistId);
                            })
                          }
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-control border border-line bg-canvas p-4">
                  <h3 className="font-display text-base font-semibold text-heading">
                    Bloqueos por fecha
                  </h3>
                  <form onSubmit={addBlock} className="mt-3 grid gap-3">
                    <Field id="block-start" label="Desde">
                      <input
                        type="datetime-local"
                        required
                        value={blockStart}
                        onChange={(event) => setBlockStart(event.target.value)}
                        className={controlClass}
                      />
                    </Field>
                    <Field id="block-end" label="Hasta">
                      <input
                        type="datetime-local"
                        required
                        value={blockEnd}
                        onChange={(event) => setBlockEnd(event.target.value)}
                        className={controlClass}
                      />
                    </Field>
                    <Field id="block-reason" label="Motivo (opcional)">
                      <input
                        value={blockReason}
                        onChange={(event) => setBlockReason(event.target.value)}
                        placeholder="Ej. Vacaciones, congreso..."
                        className={controlClass}
                      />
                    </Field>
                    <Button type="submit" variant="danger" disabled={busy}>
                      Bloquear horario
                    </Button>
                  </form>

                  <div className="mt-4 grid gap-2">
                    {blocks.length === 0 && (
                      <p className="rounded-control border border-dashed border-line p-3 text-sm text-muted">
                        No hay bloqueos por fecha.
                      </p>
                    )}
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-start justify-between gap-3 rounded-control border border-warning-border bg-warning-soft p-3 text-sm"
                      >
                        <div>
                          <strong className="block text-heading">
                            {new Date(block.startsAt).toLocaleString()}
                          </strong>
                          <span className="text-muted">
                            Hasta: {new Date(block.endsAt).toLocaleString()}
                          </span>
                          <small className="block text-muted">
                            Motivo: {block.reason || 'No especificado'}
                          </small>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Eliminar bloqueo del ${new Date(block.startsAt).toLocaleDateString()}`}
                          onClick={() =>
                            void run(async () => {
                              await call(dentistPath + '/blocks/' + block.id, {
                                method: 'DELETE',
                              });
                              await loadSchedule(scheduleDentistId);
                            })
                          }
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </AdminShell>
  );
}
