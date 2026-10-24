export interface Service {
  id: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  priceFrom: number | null;
}
export interface ClinicServiceManagement {
  id: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
  priceFrom: number | null;
}
export type ClinicServiceInput = Pick<
  ClinicServiceManagement,
  'name' | 'description' | 'estimatedDurationMinutes'
>;
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
  city: string;
  neighborhood: string;
  municipality: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  services: Service[];
  dentists?: Dentist[];
}
export type ClinicProfileInput = Omit<Clinic, 'id' | 'imageUrl' | 'services' | 'dentists'>;
export interface ApiResponse<T> {
  data: T;
}
