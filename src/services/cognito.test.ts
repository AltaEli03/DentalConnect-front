import { beforeEach, describe, expect, it, vi } from 'vitest';

type SessionMock = {
  isValid: () => boolean;
  getIdToken: () => { decodePayload: () => Record<string, unknown> };
};

type UserMock = {
  data: { Username: string; Pool: unknown; Storage?: Storage };
  getSession: ReturnType<typeof vi.fn>;
  updateAttributes: ReturnType<typeof vi.fn>;
  getUserAttributes: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  confirmRegistration: ReturnType<typeof vi.fn>;
  getUsername: () => string;
};

type PoolMock = { data: { Storage?: Storage } };

const mocks = vi.hoisted(() => {
  const users: UserMock[] = [];
  const pools: PoolMock[] = [];
  const state: { currentUser: UserMock | null; validSession: boolean; authTime: number } = {
    currentUser: null,
    validSession: true,
    authTime: Math.floor(Date.now() / 1000),
  };

  class CognitoUserMock {
    data: UserMock['data'];
    getSession = vi.fn((callback: (error: Error | null, session: SessionMock | null) => void) => {
      callback(
        null,
        state.validSession
          ? {
              isValid: () => true,
              getIdToken: () => ({
                decodePayload: () => ({
                  email: 'ana@example.com',
                  given_name: 'Ana',
                  family_name: 'Pérez',
                  auth_time: state.authTime,
                }),
              }),
            }
          : { isValid: () => false, getIdToken: () => ({ decodePayload: () => ({}) }) },
      );
    });
    updateAttributes = vi.fn((_attributes: unknown, callback: (error: Error | null) => void) => {
      callback(null);
    });
    getUserAttributes = vi.fn((callback: (error: Error | null, attributes: unknown[]) => void) =>
      callback(null, []),
    );
    signOut = vi.fn();
    confirmRegistration = vi.fn(
      (_code: string, _force: boolean, callback: (error: Error | null) => void) => callback(null),
    );

    constructor(data: UserMock['data']) {
      this.data = data;
      users.push(this);
    }

    getUsername() {
      return this.data.Username;
    }
  }

  class CognitoUserPoolMock {
    data: PoolMock['data'];

    constructor(data: PoolMock['data']) {
      this.data = data;
      pools.push(this);
    }

    getCurrentUser() {
      return state.currentUser;
    }
  }

  class CognitoUserAttributeMock {
    constructor(public data: { Name: string; Value: string }) {}
  }

  class AuthenticationDetailsMock {
    constructor(public data: Record<string, string>) {}
  }

  class CognitoUserSessionMock {}

  return {
    users,
    pools,
    state,
    CognitoUserMock,
    CognitoUserPoolMock,
    CognitoUserAttributeMock,
    AuthenticationDetailsMock,
    CognitoUserSessionMock,
  };
});

vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUser: mocks.CognitoUserMock,
  CognitoUserPool: mocks.CognitoUserPoolMock,
  CognitoUserAttribute: mocks.CognitoUserAttributeMock,
  AuthenticationDetails: mocks.AuthenticationDetailsMock,
  CognitoUserSession: mocks.CognitoUserSessionMock,
}));

async function loadCognito() {
  return import('./cognito');
}

const profile = { email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez' };

beforeEach(() => {
  vi.resetModules();
  mocks.users.length = 0;
  mocks.pools.length = 0;
  mocks.state.currentUser = null;
  mocks.state.validSession = true;
  mocks.state.authTime = Math.floor(Date.now() / 1000);
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('cognito session persistence', () => {
  it('creates users with the same persistent storage as the pool so the session survives tabs and restarts', async () => {
    const { confirm } = await loadCognito();

    await confirm('ana@example.com', '123456');

    const poolStorage = mocks.pools[0]?.data.Storage;
    expect(poolStorage).toBeDefined();
    expect(mocks.users[0]?.data.Storage).toBe(poolStorage);
  });

  it('loads the cached session before updating profile attributes', async () => {
    const { updateAccountProfile } = await loadCognito();

    const pending = updateAccountProfile({
      profile,
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '5512345678',
    });
    const user = mocks.users[0];

    expect(user.getSession).toHaveBeenCalledTimes(1);
    expect(user.updateAttributes).toHaveBeenCalledTimes(1);
    expect(user.getSession.mock.invocationCallOrder[0]).toBeLessThan(
      user.updateAttributes.mock.invocationCallOrder[0],
    );
    await expect(pending).resolves.toMatchObject({ firstName: 'Ana', lastName: 'Pérez' });
  });

  it('updates the stored Cognito user even when its username is not the profile email', async () => {
    const { updateAccountProfile } = await loadCognito();
    const storedUser = new mocks.CognitoUserMock({
      Username: 'cognito-user-uuid',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = storedUser;

    await updateAccountProfile({
      profile,
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '5512345678',
    });

    expect(storedUser.getSession).toHaveBeenCalledTimes(1);
    expect(storedUser.updateAttributes).toHaveBeenCalledTimes(1);
    expect(mocks.users).toHaveLength(1);
  });

  it('rejects without calling Cognito when the cached session is not valid', async () => {
    mocks.state.validSession = false;
    const { updateAccountProfile } = await loadCognito();

    await expect(
      updateAccountProfile({ profile, firstName: 'Ana', lastName: 'Pérez', phone: '5512345678' }),
    ).rejects.toThrow('Tu sesión expiró');
    expect(mocks.users[0].updateAttributes).not.toHaveBeenCalled();
  });

  it('signs out the active user', async () => {
    const { currentUser, signOut } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;

    await expect(currentUser()).resolves.toMatchObject({ email: 'ana@example.com' });
    signOut();

    expect(user.signOut).toHaveBeenCalledTimes(1);
  });

  it('keeps a normal session younger than the 15-minute maximum', async () => {
    const { SESSION_MAX_MS, currentUser } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;
    mocks.state.authTime = Math.floor((Date.now() - 14 * 60 * 1000) / 1000);

    await expect(currentUser()).resolves.toMatchObject({ email: 'ana@example.com' });
    expect(SESSION_MAX_MS).toBe(15 * 60 * 1000);
    expect(user.signOut).not.toHaveBeenCalled();
  });

  it('stops issuing API tokens for a normal session after 15 minutes', async () => {
    const { currentIdToken } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;
    mocks.state.authTime = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);

    await expect(currentIdToken()).resolves.toBeNull();
    expect(user.signOut).toHaveBeenCalledTimes(1);
  });

  it('keeps a remembered session through day four', async () => {
    window.localStorage.setItem(
      'CognitoIdentityServiceProvider.2ldk42uud5g41rqepe4o4salkg.LastAuthUser',
      'ana@example.com',
    );
    const { REMEMBERED_SESSION_MAX_MS, currentUser } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;
    mocks.state.authTime = Math.floor((Date.now() - 4 * 24 * 60 * 60 * 1000) / 1000);

    await expect(currentUser()).resolves.toMatchObject({ email: 'ana@example.com' });
    expect(REMEMBERED_SESSION_MAX_MS).toBe(5 * 24 * 60 * 60 * 1000);
    expect(user.signOut).not.toHaveBeenCalled();
  });

  it('stops issuing API tokens for a remembered session after five days', async () => {
    window.localStorage.setItem(
      'CognitoIdentityServiceProvider.2ldk42uud5g41rqepe4o4salkg.LastAuthUser',
      'ana@example.com',
    );
    const { currentIdToken } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;
    mocks.state.authTime = Math.floor((Date.now() - 6 * 24 * 60 * 60 * 1000) / 1000);

    await expect(currentIdToken()).resolves.toBeNull();
    expect(user.signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects profile changes for a normal session after 15 minutes', async () => {
    const { updateAccountProfile } = await loadCognito();
    const user = new mocks.CognitoUserMock({
      Username: 'ana@example.com',
      Pool: mocks.pools[0],
      Storage: window.localStorage,
    });
    mocks.state.currentUser = user;
    mocks.state.authTime = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);

    await expect(
      updateAccountProfile({ profile, firstName: 'Ana', lastName: 'Pérez', phone: '5512345678' }),
    ).rejects.toThrow('Tu sesión superó el máximo de 15 minutos');
    expect(user.updateAttributes).not.toHaveBeenCalled();
    expect(user.signOut).toHaveBeenCalledTimes(1);
  });
});
