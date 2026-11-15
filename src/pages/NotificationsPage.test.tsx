import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { currentUser } from '../services/cognito';
import { api } from '../services/api';
import type { UserNotification } from '../types/api';
import { NotificationsPage } from './NotificationsPage';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => ({
  api: {
    notifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
  ApiError: class MockApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));

const notification = (overrides: Partial<UserNotification> = {}): UserNotification => ({
  id: 'notice-1',
  eventType: 'APPOINTMENT_CONFIRMED',
  title: 'Cita confirmada',
  message: 'El consultorio confirmó tu solicitud.',
  appointmentId: 'appointment-1',
  createdAt: new Date().toISOString(),
  readAt: null,
  isRead: false,
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/notificaciones']}>
      <AuthProvider>
        <NotificationsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'patient@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    role: 'PACIENTE',
  });
  vi.mocked(api.notifications).mockResolvedValue({ data: [notification()], unreadCount: 1 });
  vi.mocked(api.markNotificationRead).mockResolvedValue({} as never);
  vi.mocked(api.markAllNotificationsRead).mockResolvedValue({} as never);
});

describe('NotificationsPage', () => {
  it('shows private notices and allows marking a notice as read', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cita confirmada' })).toBeInTheDocument();
    expect(screen.getByText('1 aviso sin leer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como leído' }));

    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith('notice-1'));
    expect(await screen.findByText('Estás al día.')).toBeInTheDocument();
    expect(screen.queryByText('Sin leer')).not.toBeInTheDocument();
  });

  it('links clinic notifications to the clinic request manager', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      email: 'clinic@example.com',
      firstName: 'Clinic',
      lastName: 'Admin',
      role: 'CLINIC_ADMIN',
    });
    vi.mocked(api.notifications).mockResolvedValue({
      data: [notification({ eventType: 'APPOINTMENT_REQUESTED', title: 'Nueva solicitud' })],
      unreadCount: 1,
    });
    renderPage();

    expect(await screen.findByRole('link', { name: 'Revisar solicitud' })).toHaveAttribute(
      'href',
      '/administrar-solicitudes?appointmentId=appointment-1',
    );
  });

  it('asks for login and does not call notifications for a signed-out visitor', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    );
    expect(api.notifications).not.toHaveBeenCalled();
  });
});
