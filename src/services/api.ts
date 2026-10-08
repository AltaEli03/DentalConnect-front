import type { ApiResponse, Clinic } from '../types/api';

const baseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  'https://nobhewluvya3gcb4e65utzf5qq0cjtwf.lambda-url.us-east-1.on.aws/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'No encontramos ese consultorio.'
        : 'No fue posible consultar la información.',
    );
  return (await response.json()) as T;
}

export const api = {
  clinics: (search = '') =>
    request<ApiResponse<Clinic[]>>(
      `/clinics${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  clinic: (id: string) => request<ApiResponse<Clinic>>(`/clinics/${id}`),
  register: (body: Record<string,string>) => request<{data:{user:User}}>('/auth/register',{method:'POST',body:JSON.stringify(body)}),
  verify: (body: {email:string;code:string}) => request('/auth/verify-email',{method:'POST',body:JSON.stringify(body)}),
  resend: (email:string) => request('/auth/resend-verification-code',{method:'POST',body:JSON.stringify({email})}),
  login: (body:{email:string;password:string}) => request<{data:{user:User}}>('/auth/login',{method:'POST',body:JSON.stringify(body)}),
  me: () => request<{data:{user:User}}>('/auth/me'),
  logout: () => request<void>('/auth/logout',{method:'POST'}),
};

export type User = {id:string;firstName:string;lastName:string;email:string;phone:string;role:string;isEmailVerified:boolean;isActive:boolean;createdAt:string};
