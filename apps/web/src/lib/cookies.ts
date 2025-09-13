import { cookies } from 'next/headers';
export function setSessionCookie(value: string) {
  const isHttps = (process.env.APP_BASE_URL || '').startsWith('https://');
  cookies().set('session', value, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearSessionCookie() {
  try {
    cookies().delete('session');
  } catch {
    // no-op
  }
}
