import { apiBaseUrl, ApiError } from './api';
import { currentIdToken } from './cognito';
import { showFeedback } from '../lib/feedback';

export async function clinicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBaseUrl();
  const token = await currentIdToken();
  if (!token) throw new ApiError('Inicia sesión con una cuenta autorizada del consultorio.', 401);
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);
  if (init.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(base + path, { ...init, headers });
  } catch (cause) {
    showFeedback({
      type: 'error',
      title: 'No hay conexión con el servicio',
      message: 'Revisa internet e inténtalo de nuevo. No se cerró tu sesión.',
    });
    throw cause;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.error?.message ||
      body?.message ||
      body?.title ||
      (response.status === 403
        ? 'Tu cuenta no tiene permisos para administrar este consultorio.'
        : response.status === 404
          ? 'La solicitud no existe o no pertenece a tu consultorio.'
          : 'Error HTTP ' + response.status);
    throw new ApiError(message, response.status);
  }
  const result = response.status === 204 ? (null as T) : await response.json();
  if (init.method && init.method !== 'GET') {
    showFeedback({
      type: 'success',
      title: 'Cambios guardados',
      message: 'La información del consultorio se actualizó correctamente.',
    });
  }
  return result as T;
}
