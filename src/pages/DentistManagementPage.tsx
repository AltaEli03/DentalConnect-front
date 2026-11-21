import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { isClinicAdmin } from '../lib/roles';
import { api } from '../services/api';
import { clinicRequest } from '../services/clinicApi';

type Dentist = { id: string; firstName: string; lastName: string; professionalLicense: string; specialty: string; biography: string; imageUrl?: string | null; isActive: boolean; services?: Array<{ id: string; name: string }> };
type Weekly = { id: string; dayOfWeek: number; startsAt: string; endsAt: string; breakStartsAt?: string | null; breakEndsAt?: string | null };
type Block = { id: string; startsAt: string; endsAt: string; reason?: string | null };
type DentalService = { id: string; name: string };
type OwnClinic = { data: { clinicId: string; name: string } };
type DentistList = { data: Dentist[] };
const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const emptyDentist = { firstName: '', lastName: '', professionalLicense: '', specialty: '', biography: '', imageUrl: '', dentalServiceIds: [] as string[] };

export function DentistManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const [clinicId, setClinicId] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dentists, setDentists] = useState<Dentist[]>([]); 
  const [services, setServices] = useState<DentalService[]>([]); 
  const [selected, setSelected] = useState(''); 
  const [scheduleDentistId, setScheduleDentistId] = useState('');
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
      await loadDentists(); 
    }); 
  }

  async function addWeekly(e:FormEvent) { 
    e.preventDefault(); 
    if(!scheduleDentistId)return;
    await run(async()=>{ 
      await call('/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+encodeURIComponent(scheduleDentistId)+'/schedule',{method:'POST',body:JSON.stringify({dayOfWeek:Number(day),startsAt:starts,endsAt:ends,breakStartsAt:breakStart||null,breakEndsAt:breakEnd||null})});
      await loadSchedule(); 
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
    <main className="dashboard-page">
      <section className="panel dashboard-header-panel">
        <div>
          <p className="eyebrow">{clinicName}</p>
          <h1>Dentistas y horarios</h1>
          <p className="text-muted">Agrega profesionales y define sus servicios y horarios semanales.</p>
        </div>
        <Link to="/consultorio/configuracion" className="secondary-btn">Volver a perfil y servicios</Link>
      </section>

      {message && (
        <div className="notice error" role="alert">
          <p>{message}</p>
        </div>
      )}

      {clinicId && (
        <div className="management-layout">
          
          {/* COLUMNA IZQUIERDA: LISTA DE DENTISTAS */}
          <section className="panel list-panel">
            <div className="panel-header">
              <h2>Dentistas</h2>
              <span className="badge">{dentists.length}</span>
            </div>
            
            {dentists.length === 0 ? (
            <p className="empty-state">Aún no hay dentistas. Agrega el primero en el formulario.</p>
            ) : (
              <div className="dentist-list">
                {dentists.map(d => (
                  <article key={d.id} className={`dentist-card ${selected === d.id ? 'selected' : ''}`}>
                    <div className="dentist-card-header">
                      <h3>{d.firstName} {d.lastName}</h3>
                      <span className={`status-badge ${d.isActive ? 'active' : 'inactive'}`}>
                        {d.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="dentist-specialty">{d.specialty} · Céd. {d.professionalLicense}</p>
                    <p className="dentist-services">
                      {(d.services||[]).map(s=>s.name).join(' • ') || 'Sin servicios asignados'}
                    </p>
                    <div className="dentist-actions">
                      <button type="button" className="secondary-btn" onClick={()=>edit(d)}>Editar perfil</button>
                      <button type="button" className="secondary-btn" disabled={!d.isActive} title={!d.isActive ? 'Activa al dentista para configurar su agenda' : undefined} onClick={()=>setScheduleDentistId(d.id)}>Horarios</button>
                      <button type="button" className={`danger-btn ${d.isActive ? '' : 'success-btn'}`} onClick={()=>void toggle(d)}>
                        {d.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <section className="panel form-panel">
            <h2>{selected ? 'Editar Perfil' : 'Nuevo Dentista'}</h2>
            <form onSubmit={saveDentist} className="premium-form">
              <div className="form-row">
                <label>Nombre(s)
                  <input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/>
                </label>
                <label>Apellidos
                  <input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/>
                </label>
              </div>
              
              <div className="form-row">
                <label>Cédula Profesional
                  <input required value={form.professionalLicense} onChange={e=>setForm({...form,professionalLicense:e.target.value})}/>
                </label>
                <label>Especialidad
                  <input required value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}/>
                </label>
              </div>

              <label>Fotografía PNG/JPEG/WebP (máx. 5 MB)<input key={imageInputKey} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const input=e.currentTarget;const file=input.files?.[0]??null;if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){setMessage('Selecciona PNG, JPEG o WebP de hasta 5 MB.');input.value='';return;}setImageFile(file);setMessage('');}}/><small>{imageFile?'Archivo seleccionado: '+imageFile.name:'La foto se carga al guardar.'}</small></label><label>URL de Fotografía (Opcional)
                <input type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://..." />
              </label>

              <label>Biografía
                <textarea rows={4} value={form.biography} onChange={e=>setForm({...form,biography:e.target.value})} placeholder="Breve resumen profesional..." />
              </label>

              <fieldset className="services-fieldset">
                <legend>Servicios que ofrece</legend>
                <div className="checkbox-grid">
                  {services.map(s => (
                    <label key={s.id} className={`checkbox-pill ${form.dentalServiceIds.includes(s.id) ? 'checked' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={form.dentalServiceIds.includes(s.id)} 
                        onChange={e=>setForm({...form,dentalServiceIds:e.target.checked?[...form.dentalServiceIds,s.id]:form.dentalServiceIds.filter(id=>id!==s.id)})}
                      /> 
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="submit" disabled={busy} className="primary-btn">
                  {selected ? 'Guardar Cambios' : 'Crear Dentista'}
                </button>
                {selected && (
                  <button type="button" className="secondary-btn" onClick={()=>{setSelected('');setForm(emptyDentist); setImageFile(null); setImageInputKey(value=>value+1); setImageFile(null); setImageInputKey(value=>value+1);}}>
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {scheduleDentistId && (
        <section className="panel schedule-panel">
          <div className="panel-header">
            <h2>Horario de {dentists.find(d => d.id === scheduleDentistId)?.firstName} {dentists.find(d => d.id === scheduleDentistId)?.lastName}</h2>
            <p className="text-muted">Define cuándo atiende cada semana. Ejemplo: lunes, 09:00–19:00. Zona horaria: Ciudad de México.</p>
          </div>

          <div className="schedule-grid">
            {/* JORNADAS SEMANALES */}
            <div className="schedule-column">
              <h3>Horario semanal</h3>
              <form onSubmit={addWeekly} className="compact-form">
                <div className="form-grid-compact">
                  <label>Día
                    <select value={day} onChange={e=>setDay(e.target.value)}>
                      {days.map((name,i)=><option key={name} value={i}>{name}</option>)}
                    </select>
                  </label>
                  <label>Inicio
                    <input type="time" required value={starts} onChange={e=>setStarts(e.target.value)}/>
                  </label>
                  <label>Fin
                    <input type="time" required value={ends} onChange={e=>setEnds(e.target.value)}/>
                  </label>
                </div>
                <div className="form-grid-compact">
                  <label>Inicio Descanso
                    <input type="time" value={breakStart} onChange={e=>setBreakStart(e.target.value)}/>
                  </label>
                  <label>Fin Descanso
                    <input type="time" value={breakEnd} onChange={e=>setBreakEnd(e.target.value)}/>
                  </label>
                </div>
                <button disabled={busy} className="primary-btn full-width">Añadir Jornada</button>
              </form>

              <div className="schedule-list">
                {weekly.map(s=>(
                  <div key={s.id} className="schedule-item">
                    <div>
                      <strong>{days[s.dayOfWeek]}</strong>
                      <span>{String(s.startsAt).slice(0,5)} - {String(s.endsAt).slice(0,5)}</span>
                      {s.breakStartsAt && <small>Descanso: {String(s.breakStartsAt).slice(0,5)} - {String(s.breakEndsAt).slice(0,5)}</small>}
                    </div>
                    <button className="icon-btn danger" onClick={()=>void run(async()=>{await call(dentistPath+'/schedule/'+s.id,{method:'DELETE'});await loadSchedule();})}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* BLOQUEOS */}
            <div className="schedule-column">
              <h3>Bloqueos por Fecha</h3>
              <form onSubmit={addBlock} className="compact-form">
                <label>Desde
                  <input type="datetime-local" required value={blockStart} onChange={e=>setBlockStart(e.target.value)}/>
                </label>
                <label>Hasta
                  <input type="datetime-local" required value={blockEnd} onChange={e=>setBlockEnd(e.target.value)}/>
                </label>
                <label>Motivo (Opcional)
                  <input value={blockReason} onChange={e=>setBlockReason(e.target.value)} placeholder="Ej. Vacaciones, Congreso..." />
                </label>
                <button disabled={busy} className="danger-btn full-width">Bloquear Horario</button>
              </form>

              <div className="schedule-list">
                {blocks.map(b=>(
                  <div key={b.id} className="schedule-item block">
                    <div>
                      <strong>{new Date(b.startsAt).toLocaleString()}</strong>
                      <span>Hasta: {new Date(b.endsAt).toLocaleString()}</span>
                      <small>Motivo: {b.reason || 'No especificado'}</small>
                    </div>
                    <button className="icon-btn danger" onClick={()=>void run(async()=>{await call(dentistPath+'/blocks/'+b.id,{method:'DELETE'});await loadSchedule();})}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}