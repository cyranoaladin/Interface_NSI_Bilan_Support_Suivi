import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function getSessionEmail(): Promise<string | null> {
  const ck = cookies().get('session');
  if (!ck?.value) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(ck.value, secret, { algorithms: ['HS256'] });
    return (payload as any)?.email || null;
  } catch {
    return null;
  }
}

export type SessionInfo = { email: string; role?: 'TEACHER' | 'STUDENT'; } | null;

export async function getSession(): Promise<SessionInfo> {
  const ck = cookies().get('session');
  if (!ck?.value) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(ck.value, secret, { algorithms: ['HS256'] });
    const p = payload as any;
    return { email: p?.email, role: p?.role };
  } catch {
    return null;
  }
}
