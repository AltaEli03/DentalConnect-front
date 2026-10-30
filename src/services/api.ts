import type { ApiResponse, AvailabilitySlot, Clinic } from '../types/api';

const developmentBaseUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || developmentBaseUrl).replace(/\/+$/, '');
  if (!baseUrl) throw new Error('La URL de la API no está configurada para este ambiente.');
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(result?.error?.message ?? (response.status === 404 ? 'No encontramos información disponible.' : 'No fue posible consultar la información.'));
  }
  return (await response.json()) as T;
}

export const api = {
  clinics: (search = '', serviceId = '') => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (serviceId) params.set('serviceId', serviceId);
    const query = params.toString();
    return request<ApiResponse<Clinic[]>>('/clinics' + (query ? `?${query}` : ''));
  },
  clinic: (id: string) => request<ApiResponse<Clinic>>(`/clinics/${encodeURIComponent(id)}`),
  availability: (clinicId: string, dentistId: string, serviceId: string) => {
    const params = new URLSearchParams({ serviceId, days: '14' });
    return request<{ data: AvailabilitySlot[]; timeZone: string }>(
      `/clinics/${encodeURIComponent(clinicId)}/dentists/${encodeURIComponent(dentistId)}/availability?${params.toString()}`,
    );
  },
  register: (body: Record<string, string>) => request<{ data: { message: string } }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  verify: (body: { email: string; code: string; password: string }) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify(body) }),
  resend: (email: string) => request('/auth/resend-verification-code', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (body: { email: string; password: string }) => request<{ data: { user: User } }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ data: { user: User } }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};

export type User = { id: string; firstName: string; lastName: string; email: string; phone: string; role: string; isEmailVerified: boolean; isActive: boolean; createdAt: string };
