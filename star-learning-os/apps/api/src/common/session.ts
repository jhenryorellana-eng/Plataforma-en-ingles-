import type { AgeBand, StaffCapability, UserRole } from '@prisma/client';

export const SESSION_COOKIE = 'star_session';
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export interface SessionUser {
  id: string;
  displayName: string;
  role: UserRole;
  ageBand: AgeBand | null;
  mustChangePassword: boolean;
  capabilities: StaffCapability[];
}
