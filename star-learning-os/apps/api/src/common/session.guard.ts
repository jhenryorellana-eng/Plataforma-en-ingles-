import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { loadConfig } from '../config/config';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { forbidden, unauthenticated } from './errors';
import type { RequestWithUser } from './request';
import { SESSION_COOKIE, verifySession } from './session';
import type { UserRole } from '@prisma/client';

/** Autenticación por cookie httpOnly y autorización por rol (Arquitectura §10.1). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthenticated();

    const user = await verifySession(token, loadConfig().sessionSecret);
    if (!user) throw unauthenticated('Tu sesión expiró. Vuelve a iniciar sesión.');
    request.user = user;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw forbidden('Tu rol no permite esta acción');
    }
    return true;
  }
}
