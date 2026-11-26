import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from './NotificationsPage';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
  api: {
    notifications: vi.fn(),
    pushConfig: vi.fn(),
    pushSubscriptionStatus: vi.fn(),
    savePushSubscription: vi.fn(),
    removePushSubscription: vi.fn(),
  },
}));

describe('NotificationsPage Web Push', () => {
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-subscription',
    keys: { p256dh: 'test-public-key', auth: 'test-auth-key' },
  };
  const requestPermission = vi.fn();
  const getSubscription = vi.fn();
  const subscribe = vi.fn();
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'PACIENTE' },
      loading: false,
    } as never);
    vi.mocked(api.notifications).mockResolvedValue({ data: [], unreadCount: 0 } as never);
    vi.mocked(api.pushConfig).mockResolvedValue({
      data: { configured: true, publicKey: 'BElongPublicVapidKey' },
    } as never);
    vi.mocked(api.pushSubscriptionStatus).mockResolvedValue({
      data: { enabled: false, devices: 0 },
    } as never);
    vi.mocked(api.savePushSubscription).mockResolvedValue({ data: { enabled: true } } as never);
    requestPermission.mockResolvedValue('granted');
    getSubscription.mockResolvedValue(null);
    subscribe.mockResolvedValue({
      toJSON: () => subscription,
      unsubscribe: vi.fn().mockResolvedValue(true),
    });
    register.mockResolvedValue({ pushManager: { getSubscription, subscribe } });
    vi.stubGlobal(
      'Notification',
      class MockNotification {
        static permission = 'default';
        static requestPermission = requestPermission;
      },
    );
    vi.stubGlobal('PushManager', class MockPushManager {});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('asks permission only after explicit opt-in and saves the device subscription', async () => {
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const activate = await screen.findByRole('button', { name: 'Activar avisos' });
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(activate);

    expect(
      await screen.findByText('Recibirás avisos de tus citas en este dispositivo.'),
    ).toBeInTheDocument();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
    expect(api.savePushSubscription).toHaveBeenCalledWith(subscription);
    expect(await screen.findByRole('button', { name: 'Desactivar avisos' })).toBeInTheDocument();
  });
});
