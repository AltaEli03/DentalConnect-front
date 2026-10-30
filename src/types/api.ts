export interface Service {
  id: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  priceFrom: number;
}
export interface DentistService {
  id: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
}
export interface Dentist {
  id: string;
  clinicId?: string;
  firstName: string;
  lastName: string;
  specialty: string;
  professionalLicense: string;
  biography: string;
  imageUrl?: string | null;
  services?: DentistService[];
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
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  services: Service[];
  dentists?: Dentist[];
}
export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
}
export interface ApiResponse<T> {
  data: T;
}
