import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export type Role = 'TEACHER' | 'STUDENT';
export type SessionInfo = {
  email: string;
  sub?: string;
  role?: Role;
} | null;

/**
 * Get the current session information
 * @returns SessionInfo object with email, sub, and role properties, or null if no valid session
 */
export async function getSession(): Promise<SessionInfo> {
  const token = cookies().get('session')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-jwt-secret');
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const role = (payload as any)?.role as Role;

    // Extract both email and sub for compatibility
    const email = (payload as any)?.email as string;
    const sub = String((payload as any)?.sub || email || '');

    // If email is not in the token but sub is an email, use that as email
    const finalEmail = email || (sub.includes('@') ? sub : undefined);

    if (!finalEmail) {
      return null; // If we can't determine an email, return null
    }

    return {
      email: finalEmail,
      sub,
      role: role !== undefined ? role : undefined
    };
  } catch {
    return null;
  }
}

/**
 * Get the current user's email from the session
 * @returns User's email if available, otherwise null
 */
export async function getSessionEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.email || null;
}

/**
 * Get the current user's role from the session
 * @returns User's role if available, otherwise null
 */
export async function getSessionRole(): Promise<Role | null> {
  const session = await getSession();
  return session?.role || null;
}

/**
 * Assert that the current session has one of the allowed roles
 * @param session The session object to check
 * @param allowed List of allowed roles
 * @throws Error with 403 status if role is not allowed
 */
export function assertRole(session: SessionInfo, allowed: Role[]): asserts session is Required<NonNullable<SessionInfo>> {
  if (!session || !session.role || !allowed.includes(session.role)) {
    const error: any = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
}

/**
 * Check if the current session has a specific role
 * @param session The session object to check
 * @param role The role to check for
 * @returns True if session has the specified role, false otherwise
 */
export function hasRole(session: SessionInfo, role: Role): boolean {
  return session?.role === role;
}