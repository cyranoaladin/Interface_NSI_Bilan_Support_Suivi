import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
const ENC = new TextEncoder();
const secret = ENC.encode(env.JWT_SECRET);
export async function signMagicToken(email:string, expMinutes=15) {
  const now = Math.floor(Date.now()/1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg:'HS256', typ:'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expMinutes*60)
    .sign(secret);
}
export async function verifyMagicToken(token:string){
  const { payload } = await jwtVerify(token, secret, { algorithms:['HS256'] });
  return payload as { email:string; exp:number; iat:number };
}

