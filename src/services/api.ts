import type {
  ApiResponse,
  AppointmentProposal,
  AvailabilitySlot,
  Clinic,
  PatientAppointment,
} from '../types/api';
import { currentIdToken } from './cognito';

const developmentBaseUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : '';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || developmentBaseUrl).replace(
    /\/+$/,
    '',
  );
  if (!baseUrl) throw new Error('La URL de la API no está configurada para este ambiente.');
  return baseUrl;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = apiBaseUrl();
  const headers = new Headers(options.headers);
  const token = await currentIdToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(
      result?.error?.message ??
        (response.status === 404
          ? 'No encontramos información disponible.'
          : 'No fue posible consultar la información.'),
      response.status,
    );
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
  availability: (clinicId: string, dentistId: string, serviceId: string, date?: string) => {
    const params = new URLSearchParams({ serviceId });
    if (date) params.set('date', date);
    else params.set('days', '14');
    return request<{ data: AvailabilitySlot[]; timeZone: string }>(
      `/clinics/${encodeURIComponent(clinicId)}/dentists/${encodeURIComponent(dentistId)}/availability?${params.toString()}`,
    );
  },
  createAppointment: (
    body: { clinicId: string; dentistId: string; dentalServiceId: string; startsAt: string },
    idempotencyKey: string,
  ) =>
    request<{
      data: {
        id: string;
        folio: string;
        status: string;
        clinicId: string;
        dentistId: string;
        dentalServiceId: string;
        startsAt: string;
        endsAt: string;
        timeZoneId: string;
      };
    }>('/appointments', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }),
  myAppointments: () => request<{ data: PatientAppointment[] }>('/appointments/mine'),
  proposal: (appointmentId: string) =>
    request<ApiResponse<AppointmentProposal>>(
      `/appointments/${encodeURIComponent(appointmentId)}/proposal`,
    ),
  acceptProposal: (appointmentId: string) =>
    request<ApiResponse<AppointmentProposal>>(
      `/appointments/${encodeURIComponent(appointmentId)}/proposal/accept`,
      { method: 'POST' },
    ),
  rejectProposal: (appointmentId: string) =>
    request<ApiResponse<AppointmentProposal>>(
      `/appointments/${encodeURIComponent(appointmentId)}/proposal/reject`,
      { method: 'POST' },
    ),
  register: (body: Record<string, string>) =>
    request<{ data: { message: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  verify: (body: { email: string; code: string; password: string }) =>
    request('/auth/verify-email', { method: 'POST', body: JSON.stringify(body) }),
  resend: (email: string) =>
    request('/auth/resend-verification-code', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (body: { email: string; password: string }) =>
    request<{ data: { user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<{ data: { user: User } }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
};
