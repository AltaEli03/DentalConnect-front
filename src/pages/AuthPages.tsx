import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { confirm, resend, signIn, signUp } from '../services/cognito';
import { useAuth } from '../auth/AuthContext';

const message=(error:unknown)=>error instanceof Error?error.message:'No fue posible completar la operación.';
type Registration={firstName:string;lastName:string;email:string;phone:string;password:string;confirmPassword:string};

export function RegisterPage(){
  const nav=useNavigate();const[error,setError]=useState('');const[data,setData]=useState<Registration>({firstName:'',lastName:'',email:'',phone:'',password:'',confirmPassword:''});
  const submit=async(event:FormEvent)=>{event.preventDefault();setError('');if(data.password.length<12){setError('La contraseña debe tener al menos 12 caracteres.');return;}if(data.password!==data.confirmPassword){setError('Las contraseñas no coinciden.');return;}try{await signUp(data);nav(`/verificar-correo?email=${encodeURIComponent(data.email)}`);}catch(cause){setError(message(cause));}};
  return <AuthForm title="Crea tu cuenta"><form onSubmit={submit}>{[['firstName','Nombre'],['lastName','Apellidos'],['email','Correo electrónico'],['phone','Teléfono'],['password','Contraseña (12 caracteres mínimo)'],['confirmPassword','Confirmar contraseña']].map(([key,label])=><label key={key}>{label}<input required type={key.toLowerCase().includes('password')?'password':key==='email'?'email':'text'} minLength={key.toLowerCase().includes('password')?12:undefined} autoComplete={key==='password'?'new-password':key==='confirmPassword'?'new-password':key==='email'?'email':'on'} value={data[key as keyof Registration]} onChange={event=>setData({...data,[key]:event.target.value})}/></label>)}{error&&<p role="alert">{error}</p>}<button>Registrarme</button></form><p>¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p></AuthForm>;
}

export function VerifyPage(){
  const params=new URLSearchParams(location.search);const[email,setEmail]=useState(params.get('email')??'');const[code,setCode]=useState('');const[notice,setNotice]=useState('');const[seconds,setSeconds]=useState(0);const nav=useNavigate();
  const verify=async(event:FormEvent)=>{event.preventDefault();try{await confirm(email,code);nav('/iniciar-sesion');}catch(cause){setNotice(message(cause));}};
  const resendCode=async()=>{try{await resend(email);setNotice('Se envió un nuevo código de verificación.');setSeconds(60);const interval=window.setInterval(()=>setSeconds(value=>{if(value<=1){window.clearInterval(interval);return 0;}return value-1;}),1000);}catch(cause){setNotice(message(cause));}};
  return <AuthForm title="Verifica tu correo"><form onSubmit={verify}><label>Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Código de 6 dígitos<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value)}/></label>{notice&&<p role="alert">{notice}</p>}<button>Verificar cuenta</button></form><button type="button" disabled={seconds>0} onClick={()=>void resendCode()}>{seconds?`Reenviar en ${seconds}s`:'Reenviar código'}</button></AuthForm>;
}

export function LoginPage(){
  const{user,acceptLogin}=useAuth();const nav=useNavigate();const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);if(user)return <Navigate to="/mi-cuenta" replace/>;
  const submit=async(event:FormEvent)=>{event.preventDefault();setError('');setBusy(true);try{const profile=await signIn(email,password);acceptLogin(profile);nav('/mi-cuenta',{replace:true});}catch(cause){setError(message(cause));}finally{setBusy(false);}};
  return <AuthForm title="Inicia sesión"><form onSubmit={submit}><label>Correo electrónico<input required type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Validando…':'Entrar'}</button></form><Link to="/registro">Crear cuenta</Link></AuthForm>;
}

export function AccountPage(){const{user,loading,logout}=useAuth();const nav=useNavigate();if(loading)return <p>Cargando sesión…</p>;if(!user)return <Navigate to="/iniciar-sesion" replace/>;return <AuthForm title="Mi cuenta"><p>{user.firstName} {user.lastName}</p><p>{user.email}</p><p>Rol: PACIENTE</p><button onClick={()=>void logout().then(()=>nav('/iniciar-sesion'))}>Cerrar sesión</button></AuthForm>;}
function AuthForm({title,children}:{title:string;children:ReactNode}){return <main className="auth-page"><h1>{title}</h1>{children}</main>;}
