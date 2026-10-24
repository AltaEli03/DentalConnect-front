import type {
  ApiResponse,
  Clinic,
  ClinicProfileInput,
  ClinicServiceInput,
  ClinicServiceManagement,
} from '../types/api';

const developmentBaseUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : '';

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorResponse = {
  error?: { message?: string; details?: { fieldErrors?: FieldErrors } };
};

function fallbackMessage(status: number) {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  if (status === 403) return 'No tienes permiso para administrar este consultorio.';
  if (status === 404) return 'No encontramos ese consultorio.';
  return 'No fue posible consultar la información.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || developmentBaseUrl).replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('La URL de la API no está configurada para este ambiente.');
  }
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ErrorResponse | null;
    throw new ApiError(
      result?.error?.message ?? fallbackMessage(response.status),
      response.status,
      result?.error?.details?.fieldErrors ?? {},
    );
  }
  return (await response.json()) as T;
}

export const api = {
  clinics: (search = '') =>
    request<ApiResponse<Clinic[]>>(
      `/clinics${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  clinic: (id: string) => request<ApiResponse<Clinic>>(`/clinics/${id}`),
  updateClinic: (id: string, body: ClinicProfileInput, token: string) =>
    request<ApiResponse<Clinic>>(`/clinics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  clinicServices: (clinicId: string, token: string) =>
    request<ApiResponse<ClinicServiceManagement[]>>(
      `/clinics/${encodeURIComponent(clinicId)}/services`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  createClinicService: (clinicId: string, body: ClinicServiceInput, token: string) =>
    request<ApiResponse<ClinicServiceManagement>>(
      `/clinics/${encodeURIComponent(clinicId)}/services`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      },
    ),
  updateClinicService: (
    clinicId: string,
    serviceId: string,
    body: ClinicServiceInput,
    token: string,
  ) =>
    request<ApiResponse<ClinicServiceManagement>>(
      `/clinics/${encodeURIComponent(clinicId)}/services/${encodeURIComponent(serviceId)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      },
    ),
  setClinicServiceStatus: (clinicId: string, serviceId: string, isActive: boolean, token: string) =>
    request<ApiResponse<ClinicServiceManagement>>(
      `/clinics/${encodeURIComponent(clinicId)}/services/${encodeURIComponent(serviceId)}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      },
    ),
  register: (body: Record<string,string>) => request<{data:{message:string}}>('/auth/register',{method:'POST',body:JSON.stringify(body)}),
  verify: (body: {email:string;code:string;password:string}) => request('/auth/verify-email',{method:'POST',body:JSON.stringify(body)}),
  resend: (email:string) => request('/auth/resend-verification-code',{method:'POST',body:JSON.stringify({email})}),
  login: (body:{email:string;password:string}) => request<{data:{user:User}}>('/auth/login',{method:'POST',body:JSON.stringify(body)}),
  me: () => request<{data:{user:User}}>('/auth/me'),
  logout: () => request<void>('/auth/logout',{method:'POST'}),
};

export type User = {id:string;firstName:string;lastName:string;email:string;phone:string;role:string;isEmailVerified:boolean;isActive:boolean;createdAt:string};
