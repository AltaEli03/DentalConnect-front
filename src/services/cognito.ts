import { AuthenticationDetails, CognitoUser, CognitoUserAttribute, CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js';

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_hVMMVyRtS',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '2ldk42uud5g41rqepe4o4salkg',
  Storage: window.sessionStorage,
});

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return `+${digits}`;
  return digits.startsWith('52') ? `+${digits}` : `+52${digits}`;
}

export function signUp(input: {firstName:string;lastName:string;email:string;phone:string;password:string}) {
  const attrs = [
    new CognitoUserAttribute({ Name: 'email', Value: input.email.trim().toLowerCase() }),
    new CognitoUserAttribute({ Name: 'given_name', Value: input.firstName }),
    new CognitoUserAttribute({ Name: 'family_name', Value: input.lastName }),
    new CognitoUserAttribute({ Name: 'phone_number', Value: normalizePhone(input.phone) }),
  ];
  return new Promise<void>((resolve, reject) => pool.signUp(input.email.trim().toLowerCase(), input.password, attrs, [], (error) => error ? reject(error) : resolve()));
}

function getUser(email:string) { return new CognitoUser({ Username:email.trim().toLowerCase(), Pool:pool }); }
export function confirm(email:string, code:string) { return new Promise<void>((resolve,reject)=>getUser(email).confirmRegistration(code.trim(),true,(error)=>error?reject(error):resolve())); }
export function resend(email:string) { return new Promise<void>((resolve,reject)=>getUser(email).resendConfirmationCode((error)=>error?reject(error):resolve())); }
export function signIn(email:string,password:string) { return new Promise<void>((resolve,reject)=>getUser(email).authenticateUser(new AuthenticationDetails({Username:email.trim().toLowerCase(),Password:password}),{onSuccess:()=>resolve(),onFailure:reject})); }
export type CognitoProfile={email:string;firstName:string;lastName:string};
export function currentUser() { return new Promise<CognitoProfile|null>((resolve)=>{const user=pool.getCurrentUser();if(!user)return resolve(null);user.getSession((error:Error|null,session:CognitoUserSession|null)=>{if(error||!session?.isValid())return resolve(null);user.getUserAttributes((_attributeError,attributes)=>{const value=(name:string)=>attributes?.find((attribute)=>attribute.getName()===name)?.getValue()||'';resolve({email:value('email')||user.getUsername(),firstName:value('given_name'),lastName:value('family_name')});});});}); }
export function signOut() { pool.getCurrentUser()?.signOut(); }
