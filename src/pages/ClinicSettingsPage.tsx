import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, buttonStyles } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
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
  const [notice, setNotice] = useState('');

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
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await clinicRequest<{ data: ClinicProfile }>('/clinics/' + encodeURIComponent(clinicId) + '/management', {
        method: 'PUT', body: JSON.stringify({ ...clinic, latitude: clinic.latitude ?? null, longitude: clinic.longitude ?? null }),
      });
      setClinic(result.data); setNotice('La información pública del consultorio se guardó.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el consultorio.'); }
    finally { setSaving(false); }
  };

  const saveService = async (service: ServiceOffering) => {
    if (!clinicId) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await clinicRequest('/clinics/' + encodeURIComponent(clinicId) + '/management/services/' + encodeURIComponent(service.id), {
        method: 'PUT', body: JSON.stringify({ isActive: service.isOffered, priceFrom: Number(service.priceFrom ?? 0) }),
      });
      setNotice(service.name + ': cambios guardados.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el servicio.'); }
    finally { setSaving(false); }
  };

  if (authLoading || loading) return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" role="status"><p className="sr-only">Cargando configuración…</p><Skeleton className="h-48 w-full" /></main>;
  if (!user) return <Navigate to="/iniciar-sesion" replace state={{ from: '/consultorio/configuracion' }} />;
  if (!isClinicAdmin(user.role)) return <main className="mx-auto max-w-3xl px-4 py-10"><Notice tone="error" title="Acceso restringido">Solo una cuenta autorizada del consultorio puede cambiar estos datos.</Notice></main>;

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-accent-strong">Administración</p><h1 className="mt-1 font-display text-3xl font-semibold text-heading">Perfil y servicios</h1><p className="mt-2 text-muted">Actualiza la información que ven los pacientes.</p></div><Link className={buttonStyles('outline','sm')} to="/administrar-dentistas">Administrar dentistas</Link></div>
    {error && <Notice tone="error" title="No se completó la operación" className="mb-5"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Reintentar</Button></Notice>}
    {notice && <Notice tone="success" title="Cambios guardados" className="mb-5">{notice}</Notice>}
    {!clinic && !error && <Notice tone="info" title="Consultorio no vinculado">Tu cuenta debe estar aprobada y asociada a un consultorio antes de administrar su perfil.</Notice>}
    {clinic && <>
      <form onSubmit={saveProfile} className="mb-8 grid gap-4 rounded-card border border-line bg-surface p-5 shadow-sm sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-display text-xl font-semibold text-heading">Información pública</h2>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Nombre<input required maxLength={120} value={clinic.name} onChange={e=>setClinic({...clinic,name:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Correo de contacto<input required type="email" maxLength={254} value={clinic.email} onChange={e=>setClinic({...clinic,email:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Teléfono<input required maxLength={30} value={clinic.phone} onChange={e=>setClinic({...clinic,phone:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Dirección<input required maxLength={250} value={clinic.address} onChange={e=>setClinic({...clinic,address:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Municipio<input required maxLength={100} value={clinic.municipality} onChange={e=>setClinic({...clinic,municipality:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Estado<input required maxLength={100} value={clinic.state} onChange={e=>setClinic({...clinic,state:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Código postal<input required maxLength={20} value={clinic.postalCode} onChange={e=>setClinic({...clinic,postalCode:e.target.value})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Descripción<textarea required maxLength={2000} rows={4} value={clinic.description} onChange={e=>setClinic({...clinic,description:e.target.value})} className="rounded-control border border-control bg-surface p-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">URL de imagen<input type="url" maxLength={2048} placeholder="https://…" value={clinic.imageUrl ?? ''} onChange={e=>setClinic({...clinic,imageUrl:e.target.value||null})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /><span className="text-xs font-normal text-muted">Se guarda la dirección de una imagen HTTPS. La carga de archivos a almacenamiento aún no está habilitada.</span></label>
        <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2"><label className="grid gap-1.5 text-sm font-semibold text-ink">Latitud<input type="number" step="any" min="-90" max="90" value={clinic.latitude ?? ''} onChange={e=>setClinic({...clinic,latitude:e.target.value===''?null:Number(e.target.value)})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label><label className="grid gap-1.5 text-sm font-semibold text-ink">Longitud<input type="number" step="any" min="-180" max="180" value={clinic.longitude ?? ''} onChange={e=>setClinic({...clinic,longitude:e.target.value===''?null:Number(e.target.value)})} className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal" /></label></div>
        <div className="sm:col-span-2"><Button type="submit" disabled={saving} loading={saving}>Guardar perfil</Button></div>
      </form>
      <section className="rounded-card border border-line bg-surface p-5 shadow-sm" aria-labelledby="services-heading"><h2 id="services-heading" className="font-display text-xl font-semibold text-heading">Servicios del consultorio</h2><p className="mt-1 text-sm text-muted">Activa los servicios que ofreces y define el precio inicial.</p>
        {services.length===0 ? <Notice tone="info" className="mt-4">No hay servicios disponibles en el catálogo.</Notice> : <ul className="mt-4 divide-y divide-line">{services.map(service=><li key={service.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center"><div><h3 className="font-semibold text-heading">{service.name}</h3><p className="text-sm text-muted">{service.description} · {service.estimatedDurationMinutes} min</p></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={service.isOffered} onChange={e=>setServices(items=>items.map(item=>item.id===service.id?{...item,isOffered:e.target.checked}:item))} />Ofrecido</label><div className="flex items-center gap-2"><label className="sr-only" htmlFor={'service-price-'+service.id}>Precio inicial</label><span aria-hidden="true">$</span><input id={'service-price-'+service.id} type="number" min="0" max="1000000" step="0.01" value={service.priceFrom ?? 0} onChange={e=>setServices(items=>items.map(item=>item.id===service.id?{...item,priceFrom:Number(e.target.value)}:item))} className="min-h-10 w-28 rounded-control border border-control bg-surface px-2" /><Button variant="outline" size="sm" disabled={saving} onClick={()=>void saveService(service)}>Guardar</Button></div></li>)}</ul>}
      </section>
    </>}
  </main>;
}
