export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-control bg-line ${className}`}
      aria-hidden="true"
    />
  );
}
