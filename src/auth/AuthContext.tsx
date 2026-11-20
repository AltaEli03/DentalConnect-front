import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { currentUser, signOut, type CognitoProfile } from '../services/cognito';
import { api } from '../services/api';

// 1. Definición de tipos clara
type AuthState = {
  user: CognitoProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  acceptLogin: (user: CognitoProfile) => void;
  updateProfile: (user: CognitoProfile) => void;
  logout: () => Promise<void>;
};

// 2. Creación del Contexto
const AuthContext = createContext<AuthState | undefined>(undefined);

// 3. Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Función que se llama justo después del login exitoso
  const acceptLogin = (profile: CognitoProfile) => {
    setUser(profile);
    setLoading(false);
  };

  const refresh = async () => {
    try {
      const profile = await currentUser();
      if (!profile) {
        setUser(null);
      } else {
        try {
          const response = await api.me();
          setUser({ ...profile, ...response.data.user, clinicId: response.data.user.clinicId || profile.clinicId });
        } catch {
          // Un fallo temporal de API conserva la sesión válida de Cognito.
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Error al verificar la sesión:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Revalida Cognito y obtiene el rol vigente de la API al iniciar o refrescar sesión.
  useEffect(() => {
    void refresh();
  }, []);

  const updateProfile = (profile: CognitoProfile) => setUser(profile);

  // Función para cerrar sesión
  const logout = async () => {
    try {
      signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, acceptLogin, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Hook personalizado para consumir el contexto de forma segura
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return value;
};
