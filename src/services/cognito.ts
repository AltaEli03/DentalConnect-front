import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_hVMMVyRtS';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '2ldk42uud5g41rqepe4o4salkg';
const storagePrefix = 'CognitoIdentityServiceProvider.' + clientId + '.';
let rememberSession = Boolean(window.localStorage.getItem('CognitoIdentityServiceProvider.' + clientId + '.LastAuthUser'));
const clearCognitoStorage = (storage: Storage) => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(storagePrefix)) storage.removeItem(key);
  }
};
const cognitoStorage = {
  getItem: (key: string) => (rememberSession ? window.localStorage : window.sessionStorage).getItem(key),
  setItem: (key: string, value: string) => (rememberSession ? window.localStorage : window.sessionStorage).setItem(key, value),
  removeItem: (key: string) => (rememberSession ? window.localStorage : window.sessionStorage).removeItem(key),
  clear: () => clearCognitoStorage(rememberSession ? window.localStorage : window.sessionStorage),
};
const storage = cognitoStorage;

export const SESSION_MAX_MS = 15 * 60 * 1000;
export const SESSION_STARTED_KEY = 'dentalconnect-session-started-at';

const pool = new CognitoUserPool({
  UserPoolId: userPoolId,
  ClientId: clientId,
  Storage: cognitoStorage,
});

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return `+${digits}`;
  return digits.startsWith('52') ? `+${digits}` : `+52${digits}`;
}

export function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const attrs = [
    new CognitoUserAttribute({ Name: 'email', Value: input.email.trim().toLowerCase() }),
    new CognitoUserAttribute({ Name: 'given_name', Value: input.firstName }),
    new CognitoUserAttribute({ Name: 'family_name', Value: input.lastName }),
    new CognitoUserAttribute({ Name: 'phone_number', Value: normalizePhone(input.phone) }),
  ];
  return new Promise<void>((resolve, reject) =>
    pool.signUp(input.email.trim().toLowerCase(), input.password, attrs, [], (error) =>
      error ? reject(error) : resolve(),
    ),
  );
}

function getUser(email: string) {
  // Same storage as the pool, or getCurrentUser() cannot find the cached session on reload or another tab.
  return new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool, Storage: cognitoStorage });
}
export function confirm(email: string, code: string) {
  return new Promise<void>((resolve, reject) =>
    getUser(email).confirmRegistration(code.trim(), true, (error) =>
      error ? reject(error) : resolve(),
    ),
  );
}
export function resend(email: string) {
  return new Promise<void>((resolve, reject) =>
    getUser(email).resendConfirmationCode((error) => (error ? reject(error) : resolve())),
  );
}
function profileFromSession(session: CognitoUserSession, user: CognitoUser): CognitoProfile {
  const claims = session.getIdToken().decodePayload();
  const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
  return {
    email: String(claims.email || user.getUsername()),
    firstName: String(claims.given_name || ''),
    lastName: String(claims.family_name || ''),
    role: String(claims['custom:role'] || claims.role || groups[0] || 'PACIENTE'),
    clinicId:
      String(
        claims['clinic_id'] ||
          claims['custom:clinic_id'] ||
          claims['clinicId'] ||
          claims['custom:clinicId'] ||
          '',
      ) || undefined,
    isEmailVerified: claims.email_verified === true || claims.email_verified === 'true',
    expiresAt: sessionExpiresAt(claims),
  };
}

function sessionExpiresAt(claims: Record<string, unknown>) {
  const authTime = Number(claims.auth_time) * 1000;
  const startedAt = Number(storage.getItem(SESSION_STARTED_KEY));
  const starts = [authTime, startedAt].filter((value) => Number.isFinite(value) && value > 0);
  // Fail closed if Cognito or the local marker cannot provide a start time.
  return starts.length ? Math.min(...starts) + SESSION_MAX_MS : 0;
}

function clearStoredSession(user?: CognitoUser | null) {
  (user ?? pool.getCurrentUser())?.signOut();
  storage.removeItem(SESSION_STARTED_KEY);
}

function readUserAttributes(user: CognitoUser) {
  return new Promise<Record<string, string>>((resolve, reject) =>
    user.getUserAttributes((error, attributes) => {
      if (error) return reject(error);
      resolve(
        Object.fromEntries(
          (attributes ?? []).map((attribute) => [attribute.getName(), attribute.getValue()]),
        ),
      );
    }),
  );
}

function withUserAttributes(
  profile: CognitoProfile,
  attributes: Record<string, string>,
): CognitoProfile {
  return {
    ...profile,
    firstName: attributes.given_name || profile.firstName,
    lastName: attributes.family_name || profile.lastName,
    phone: attributes.phone_number || profile.phone || '',
  };
}

export function updateAccountProfile(input: {
  profile: CognitoProfile;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  // Update the user that Cognito actually has cached: its username may differ
  // from the profile email. Fall back to the email only if the marker is missing.
  const user = pool.getCurrentUser() ?? getUser(input.profile.email);

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = normalizePhone(input.phone.trim());
  const attributes = [
    new CognitoUserAttribute({ Name: 'given_name', Value: firstName }),
    new CognitoUserAttribute({ Name: 'family_name', Value: lastName }),
    new CognitoUserAttribute({ Name: 'phone_number', Value: phone }),
  ];

  return new Promise<CognitoProfile>((resolve, reject) =>
    user.getSession((sessionError: Error | null, session: CognitoUserSession | null) => {
      if (sessionError || !session?.isValid()) {
        console.error(
          'No se pudo cargar la sesión de Cognito para actualizar el perfil:',
          sessionError,
        );
        return reject(
          new Error('Tu sesión expiró. Vuelve a iniciar sesión para guardar tus datos.'),
        );
      }
      const profile = profileFromSession(session, user);
      if (!profile.expiresAt || Date.now() >= profile.expiresAt) {
        clearStoredSession(user);
        return reject(
          new Error('Tu sesión superó el máximo de 15 minutos. Inicia sesión de nuevo.'),
        );
      }
      user.updateAttributes(attributes, (error) => {
        if (error) return reject(error);
        resolve({ ...input.profile, firstName, lastName, phone });
      });
    }),
  );
}
export function signIn(email: string, password: string, rememberMe = false) {
  clearCognitoStorage(rememberMe ? window.sessionStorage : window.localStorage);
  rememberSession = rememberMe;
  const user = getUser(email);
  return new Promise<CognitoProfile>((resolve, reject) =>
    user.authenticateUser(
      new AuthenticationDetails({ Username: email.trim().toLowerCase(), Password: password }),
      {
        onSuccess: (session) => {
          storage.setItem(SESSION_STARTED_KEY, String(Date.now()));
          resolve(profileFromSession(session, user));
        },
        onFailure: reject,
        newPasswordRequired: () =>
          reject(
            new Error('La cuenta requiere establecer una contraseña nueva. Contacta al soporte.'),
          ),
        mfaRequired: () =>
          reject(
            new Error(
              'La cuenta requiere verificación multifactor, pero esta pantalla aún no está configurada.',
            ),
          ),
        totpRequired: () =>
          reject(new Error('La cuenta requiere un código de autenticación multifactor.')),
        customChallenge: () =>
          reject(new Error('La cuenta requiere un paso de autenticación adicional.')),
        mfaSetup: () =>
          reject(new Error('La cuenta requiere configurar autenticación multifactor.')),
        selectMFAType: () =>
          reject(
            new Error('La cuenta requiere seleccionar un método de autenticación multifactor.'),
          ),
      },
    ),
  );
}
export type CognitoProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  clinicId?: string;
  isEmailVerified?: boolean;
  expiresAt?: number;
};
export function currentUser() {
  return new Promise<CognitoProfile | null>((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session?.isValid()) return resolve(null);
      const profile = profileFromSession(session, user);
      if (!profile.expiresAt || Date.now() >= profile.expiresAt) {
        clearStoredSession(user);
        return resolve(null);
      }
      void readUserAttributes(user).then(
        (attributes) => resolve(withUserAttributes(profile, attributes)),
        () => resolve(profile),
      );
    });
  });
}
export function signOut() {
    clearStoredSession();
  clearCognitoStorage(window.localStorage);
  clearCognitoStorage(window.sessionStorage);
  
  
}

export function currentIdToken() {
  return new Promise<string | null>((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session?.isValid()) return resolve(null);
      const profile = profileFromSession(session, user);
      if (!profile.expiresAt || Date.now() >= profile.expiresAt) {
        clearStoredSession(user);
        return resolve(null);
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function requestPasswordReset(email: string) {
  return new Promise<void>((resolve, reject) =>
    getUser(email).forgotPassword({
      onSuccess: () => resolve(),
      onFailure: reject,
      inputVerificationCode: () => resolve(),
    }),
  );
}

export function confirmPasswordReset(email: string, code: string, newPassword: string) {
  return new Promise<void>((resolve, reject) =>
    getUser(email).confirmPassword(code.trim(), newPassword, {
      onSuccess: () => resolve(),
      onFailure: reject,
    }),
  );
}
