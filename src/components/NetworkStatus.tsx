import { useEffect, useState } from 'react';
import { showFeedback } from '../lib/feedback';
import { Icon } from './ui/Icon';

export function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      showFeedback({
        type: 'success',
        title: 'Conexión restablecida',
        message: 'Ya puedes continuar usando DentalConnect.',
      });
    };
    const goOffline = () => {
      setOnline(false);
      showFeedback({
        type: 'error',
        title: 'Sin conexión',
        message: 'Revisa tu conexión. Las solicitudes y cambios necesitan internet.',
      });
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-warning-border bg-warning-soft px-4 py-2 text-center text-sm font-semibold text-warning-text"
    >
      <Icon name="alert" size={16} />
      Sin conexión. Puedes consultar la información guardada.
    </div>
  );
}
