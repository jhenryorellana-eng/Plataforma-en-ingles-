import { SignJWT, jwtVerify } from 'jose';
import type { AgeBand, UserRole } from '@prisma/client';

export const SESSION_COOKIE = 'star_session';
const SESSION_DURATION = '8h';

export interface SessionUser {
  id: string;
  displayName: string;
  role: UserRole;
  ageBand: AgeBand | null;
}

export async function signSession(user: SessionUser, secret: string): Promise<string> {
  return new SignJWT({
    displayName: user.displayName,
    role: user.role,
    ageBand: user.ageBand,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      displayName: String(payload.displayName ?? ''),
      role: payload.role as UserRole,
      ageBand: (payload.ageBand as AgeBand | null) ?? null,
    };
  } catch {
    return null;
  }
}
