import { FormEvent, useEffect, useState } from 'react';
import { ClinicCard } from '../components/ClinicCard';
import { api } from '../services/api';
import type { Clinic } from '../types/api';

export function ClinicListPage() {
  const [search, setSearch] = useState('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (term = '') => {
    setLoading(true);
    setError('');
    try {
      setClinics((await api.clinics(term)).data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(search);
  };
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Cuidado dental cerca de ti</p>
        <h1>Encuentra el consultorio ideal para tu sonrisa.</h1>
        <form onSubmit={submit}>
          <label htmlFor="search">Busca por nombre o servicio</label>
          <div className="search">
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej. ortodoncia"
            />
            <button>Buscar</button>
          </div>
        </form>
      </section>
      <section className="directory" aria-live="polite">
        <h2>Consultorios disponibles</h2>
        {loading && <p>Cargando consultorios…</p>}
        {error && (
          <div className="notice error">
            <p>{error}</p>
            <button onClick={() => void load(search)}>Reintentar</button>
          </div>
        )}
        {!loading && !error && clinics.length === 0 && (
          <p className="notice">No encontramos resultados. Prueba otra búsqueda.</p>
        )}
        <div className="card-grid">
          {clinics.map((clinic) => (
            <ClinicCard clinic={clinic} key={clinic.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
