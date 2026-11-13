import { useState } from 'react';

type ContentImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function ContentImage({ src, alt, className = '' }: ContentImageProps) {
  const [failedSource, setFailedSource] = useState('');

  if (!src || failedSource === src) {
    return (
      <div
        className={`media-placeholder ${className}`}
        role="img"
        aria-label={`${alt}. Imagen no disponible`}
      >
        <span className="media-placeholder-mark" aria-hidden="true">
          DC
        </span>
        <span>Imagen no disponible</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSource(src)}
    />
  );
}
