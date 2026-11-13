import { apiBaseUrl, ApiError } from './api';
import { currentIdToken } from './cognito';

export async function clinicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBaseUrl();
  const token = await currentIdToken();
  if (!token) throw new ApiError('Inicia sesión con una cuenta autorizada del consultorio.', 401);
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(base + path, { ...init, headers });
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
  return response.status === 204 ? (null as T) : response.json();
}
