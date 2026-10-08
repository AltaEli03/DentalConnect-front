import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { currentUser, signOut, type CognitoProfile } from '../services/cognito';
type AuthState={user:CognitoProfile|null;loading:boolean;refresh:()=>Promise<void>;acceptLogin:(user:CognitoProfile)=>void;logout:()=>Promise<void>};
const AuthContext=createContext<AuthState|undefined>(undefined);
export function AuthProvider({children}:{children:ReactNode}){const[user,setUser]=useState<CognitoProfile|null>(null);const[loading,setLoading]=useState(true);const refresh=async()=>{setUser(await currentUser());setLoading(false);};useEffect(()=>{void refresh();},[]);const acceptLogin=(profile:CognitoProfile)=>{setUser(profile);setLoading(false);};const logout=async()=>{signOut();setUser(null);};return <AuthContext.Provider value={{user,loading,refresh,acceptLogin,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>{const value=useContext(AuthContext);if(!value)throw new Error('useAuth debe usarse dentro de AuthProvider');return value;};
