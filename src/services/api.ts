import type { ApiResponse, Clinic } from '../types/api';

const baseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  'https://nobhewluvya3gcb4e65utzf5qq0cjtwf.lambda-url.us-east-1.on.aws/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
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
};
