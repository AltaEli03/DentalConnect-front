import { useState } from 'react';

type ContentImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function ContentImage({ src, alt, className = '', priority = false }: ContentImageProps) {
  const [failedSource, setFailedSource] = useState('');

  if (!src || failedSource === src) {
    return (
      <div
        className={`flex min-h-40 w-full flex-col items-center justify-center gap-2 bg-canvas text-subtle ${className}`}
        role="img"
        aria-label={`${alt}. Imagen no disponible`}
      >
        <span className="font-display text-2xl font-bold text-heading/30" aria-hidden="true">
          DC
        </span>
        <span className="text-xs font-medium">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailedSource(src)}
    />
  );
}
