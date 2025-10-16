import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type Role = "TEACHER" | "STUDENT";
export type Session = { sub?: string; role?: Role };

export async function getSession(): Promise<Session | null> {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || "dev-jwt-secret")
    );
    return { sub: String(payload.sub || payload["email"] || ""), role: (payload as any).role as Role };
  } catch {
    return null;
  }
}

export function assertRole(session: Session | null, allowed: Role[]) {
  if (!session || !session.role || !allowed.includes(session.role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}
