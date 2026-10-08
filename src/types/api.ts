export interface Service {
  id: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  priceFrom: number;
}
export interface Dentist {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  professionalLicense: string;
  biography: string;
  imageUrl?: string | null;
}
export interface Clinic {
  id: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  municipality: string;
  state: string;
  postalCode: string;
  imageUrl?: string | null;
  services: Service[];
  dentists?: Dentist[];
}
export interface ApiResponse<T> {
  data: T;
}
