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
export interface AppointmentProposal {
  id: string;
  folio: string;
  status: string;
  clinicId: string;
  dentistId: string;
  dentalServiceId: string;
  startsAt: string;
  endsAt: string;
  proposedStartsAt: string | null;
  proposedEndsAt: string | null;
  proposalExpiresAt: string | null;
  timeZoneId: string;
}
export interface ApiResponse<T> {
  data: T;
}

export interface PatientAppointment {
  id: string;
  folio: string;
  status: string;
  startsAt: string;
  endsAt: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  proposalExpiresAt?: string | null;
  createdAt?: string;
  timeZoneId?: string;
  rejectionReason?: string | null;
  clinic: {
    id: string;
    name: string;
    municipality?: string;
    state?: string;
    phone?: string;
  };
  dentist: {
    id: string;
    firstName: string;
    lastName: string;
  };
  service: {
    id: string;
    name: string;
    estimatedDurationMinutes?: number;
  };
}
