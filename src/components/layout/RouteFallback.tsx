import { Skeleton } from '../ui/Skeleton';

export function RouteFallback() {
  return (
    <main className="mx-auto min-h-[45vh] max-w-6xl px-4 py-10 sm:px-6" role="status">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-48" />
    </main>
  );
}
