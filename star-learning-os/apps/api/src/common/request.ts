import type { FastifyRequest } from 'fastify';
import type { SessionUser } from './session';

export interface RequestWithUser extends FastifyRequest {
  user?: SessionUser;
  cookies: Record<string, string | undefined>;
}
