import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from '../services/api';
type AuthState={user:User|null;loading:boolean;refresh:()=>Promise<void>;logout:()=>Promise<void>};
const AuthContext=createContext<AuthState|undefined>(undefined);
export function AuthProvider({children}:{children:ReactNode}) { const [user,setUser]=useState<User|null>(null); const [loading,setLoading]=useState(true); const refresh=async()=>{try{setUser((await api.me()).data.user);}catch{setUser(null);}finally{setLoading(false);}}; useEffect(()=>{void refresh();},[]); const logout=async()=>{await api.logout();setUser(null);}; return <AuthContext.Provider value={{user,loading,refresh,logout}}>{children}</AuthContext.Provider>; }
export const useAuth=()=>{const value=useContext(AuthContext);if(!value)throw new Error('useAuth debe usarse dentro de AuthProvider');return value;};
