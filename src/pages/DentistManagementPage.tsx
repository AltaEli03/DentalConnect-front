import { FormEvent, useEffect, useState } from 'react';
import { currentIdToken } from '../services/cognito';
import { api } from '../services/api';

type Dentist = { id: string; firstName: string; lastName: string; professionalLicense: string; specialty: string; biography: string; imageUrl?: string | null; isActive: boolean; services?: Array<{ id: string; name: string }> };
type Weekly = { id: string; dayOfWeek: number; startsAt: string; endsAt: string; breakStartsAt?: string | null; breakEndsAt?: string | null };
type Block = { id: string; startsAt: string; endsAt: string; reason?: string | null };
type DentalService = { id: string; name: string };
const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const emptyDentist = { firstName: '', lastName: '', professionalLicense: '', specialty: '', biography: '', imageUrl: '', dentalServiceIds: [] as string[] };

export function DentistManagementPage() {
  const [clinicId, setClinicId] = useState(''); 
  const [dentists, setDentists] = useState<Dentist[]>([]); 
  const [services, setServices] = useState<DentalService[]>([]); 
  const [selected, setSelected] = useState(''); 
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
  const [message, setMessage] = useState(''); 
  const [busy, setBusy] = useState(false);

  async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await currentIdToken(); if (!token) throw new Error('Inicia sesión con una cuenta administradora del consultorio.');
    const base = (import.meta.env.VITE_API_BASE_URL?.trim() || '').replace(/\/+$/, ''); if (!base) throw new Error('Falta VITE_API_BASE_URL en este ambiente.');
    const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...options.headers } });
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error?.message || (response.status === 403 ? 'Tu usuario no tiene rol de administrador vinculado a este consultorio.' : 'La operación no se pudo completar (' + response.status + ').')); }
    if (response.status === 204) return undefined as T; return response.json() as Promise<T>;
  }
  
  async function loadDentists(id = clinicId) { 
    if (!id.trim()) return; 
    const result = await call<{ data: Dentist[] }>('/api/clinics/' + encodeURIComponent(id.trim()) + '/dentists'); 
    setDentists(result.data); 
    setServices((await api.clinic(id.trim())).data.services.map((s) => ({ id: s.id, name: s.name }))); 
  }
  
  async function loadSchedule(dentistId = selected) { 
    if (!dentistId) return; 
    const path = '/api/clinics/' + encodeURIComponent(clinicId.trim()) + '/dentists/' + dentistId; 
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
  
  useEffect(() => { if (selected) void run(() => loadSchedule(selected)); }, [selected]);

  function edit(d: Dentist) { 
    setSelected(d.id); 
    setForm({ firstName:d.firstName,lastName:d.lastName,professionalLicense:d.professionalLicense,specialty:d.specialty,biography:d.biography||'',imageUrl:d.imageUrl||'',dentalServiceIds:(d.services||[]).map(s=>s.id) }); 
  }

  async function saveDentist(e: FormEvent) { 
    e.preventDefault(); 
    await run(async()=>{ 
      const editing=Boolean(selected); 
      await call('/api/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists'+(editing?'/'+selected:''),{method:editing?'PUT':'POST',body:JSON.stringify(form)}); 
      setSelected(''); 
      setForm(emptyDentist); 
      await loadDentists(); 
      setMessage('Dentista guardado correctamente.'); 
    }); 
  }

  async function toggle(d:Dentist) { 
    await run(async()=>{ 
      await call('/api/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+d.id+'/status',{method:'PATCH',body:JSON.stringify({isActive:!d.isActive})}); 
      await loadDentists(); 
    }); 
  }

  async function addWeekly(e:FormEvent) { 
    e.preventDefault(); 
    if(!selected)return; 
    await run(async()=>{ 
      await call('/api/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+selected+'/schedule',{method:'POST',body:JSON.stringify({dayOfWeek:Number(day),startsAt:starts,endsAt:ends,breakStartsAt:breakStart||null,breakEndsAt:breakEnd||null})}); 
      await loadSchedule(); 
    }); 
  }

  async function addBlock(e:FormEvent) { 
    e.preventDefault(); 
    if(!selected||!blockStart||!blockEnd)return; 
    await run(async()=>{ 
      await call('/api/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+selected+'/blocks',{method:'POST',body:JSON.stringify({startsAt:new Date(blockStart).toISOString(),endsAt:new Date(blockEnd).toISOString(),reason:blockReason})}); 
      setBlockStart('');setBlockEnd('');setBlockReason('');await loadSchedule(); 
    }); 
  }

  const dentistPath='/api/clinics/'+encodeURIComponent(clinicId.trim())+'/dentists/'+selected;

  return (
    <main className="dashboard-page">
      {/* HEADER DEL DASHBOARD */}
      <section className="panel dashboard-header-panel">
        <div>
          <p className="eyebrow">Panel de Administración</p>
          <h1>Gestión del Equipo Dental</h1>
          <p className="text-muted">Administra perfiles, servicios, jornadas y bloqueos en la zona horaria de America/Mexico_City.</p>
        </div>
        
        <form onSubmit={(e)=>{e.preventDefault();void run(()=>loadDentists());}} className="clinic-selector-form">
          <label htmlFor="clinicId">ID del Consultorio</label>
          <div className="input-with-button">
            <input id="clinicId" required value={clinicId} onChange={e=>setClinicId(e.target.value)} placeholder="Ej. clinic-123" />
            <button disabled={busy} className="primary-btn">Cargar</button>
          </div>
        </form>
      </section>

      {message && (
        <div className={`notice ${message.includes('error') || message.includes('no') ? 'error' : 'success'}`} role="alert">
          <p>{message}</p>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL (Solo si hay clinicaId) */}
      {clinicId && (
        <div className="management-layout">
          
          {/* COLUMNA IZQUIERDA: LISTA DE DENTISTAS */}
          <section className="panel list-panel">
            <div className="panel-header">
              <h2>Equipo Médico</h2>
              <span className="badge">{dentists.length} registrados</span>
            </div>
            
            {dentists.length === 0 ? (
              <p className="empty-state">No hay dentistas registrados en este consultorio.</p>
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

              <label>URL de Fotografía (Opcional)
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
                  <button type="button" className="secondary-btn" onClick={()=>{setSelected('');setForm(emptyDentist);}}>
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {/* SECCIÓN DE AGENDA (Solo si hay un dentista seleccionado) */}
      {selected && (
        <section className="panel schedule-panel">
          <div className="panel-header">
            <h2>Gestión de Agenda</h2>
            <p className="text-muted">Configura los horarios de atención y bloqueos para el doctor seleccionado.</p>
          </div>

          <div className="schedule-grid">
            {/* JORNADAS SEMANALES */}
            <div className="schedule-column">
              <h3>Jornada Semanal</h3>
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