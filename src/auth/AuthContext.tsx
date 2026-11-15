import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  type ReactNode 
} from 'react';
import { currentUser, signOut, type CognitoProfile } from '../services/cognito';

// 1. Definición de tipos clara
type AuthState = {
  user: CognitoProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  acceptLogin: (user: CognitoProfile) => void;
  logout: () => Promise<void>;
};

// 2. Creación del Contexto
const AuthContext = createContext<AuthState | undefined>(undefined);

// 3. Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para refrescar el usuario desde Cognito
  const refresh = async () => {
    try {
      const profile = await currentUser();
      setUser(profile);
    } catch (error) {
      // Si falla la consulta (ej. token expirado o sin red), 
      // aseguramos que el usuario sea null para no romper la app.
      console.error('Error al verificar la sesión:', error);
      setUser(null);
    } finally {
      // Pase lo que pase, quitamos el estado de carga
      setLoading(false);
    }
  };

  // Efecto que corre al montar el Provider
  useEffect(() => {
    void refresh();
  }, []);

  // Función que se llama justo después del login exitoso
  const acceptLogin = (profile: CognitoProfile) => {
    setUser(profile);
    setLoading(false);
  };

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
    <AuthContext.Provider value={{ user, loading, refresh, acceptLogin, logout }}>
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