import { cookies } from 'next/headers';
export function setSessionCookie(value: string) {
  cookies().set('session', value, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/'
  });
}

export function clearSessionCookie() {
  try {
    cookies().delete('session');
  } catch {
    // no-op
  }
}
