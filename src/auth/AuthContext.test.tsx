import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { currentUser } from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: { me: vi.fn() } }));

const profile = { email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez' };
const lastAuthUserKey = 'CognitoIdentityServiceProvider.2ldk42uud5g41rqepe4o4salkg.LastAuthUser';

function SessionProbe() {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando sesión…</p>;
  return <p>{user ? user.email : 'sin sesión'}</p>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
}

function dispatchStorage(key: string | null, newValue: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.me).mockRejectedValue(new Error('API no expuesta'));
  vi.mocked(currentUser).mockResolvedValue(null);
});

describe('AuthProvider cross-tab sync', () => {
  it('restores the user on mount', async () => {
    vi.mocked(currentUser).mockResolvedValue(profile);

    renderProvider();

    expect(await screen.findByText(profile.email)).toBeInTheDocument();
  });

  it('logs out when another tab removes the Cognito session', async () => {
    vi.mocked(currentUser).mockResolvedValueOnce(profile);
    renderProvider();
    await screen.findByText(profile.email);
    vi.mocked(currentUser).mockResolvedValue(null);

    dispatchStorage(lastAuthUserKey, null);

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    expect(currentUser).toHaveBeenCalledTimes(2);
  });

  it('adopts a login completed in another tab', async () => {
    renderProvider();
    await screen.findByText('sin sesión');
    vi.mocked(currentUser).mockResolvedValue(profile);

    dispatchStorage(lastAuthUserKey, profile.email);

    expect(await screen.findByText(profile.email)).toBeInTheDocument();
    expect(currentUser).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated storage changes', async () => {
    renderProvider();
    await screen.findByText('sin sesión');

    dispatchStorage('dentalconnect-theme', 'dark');

    expect(currentUser).toHaveBeenCalledTimes(1);
  });
});
