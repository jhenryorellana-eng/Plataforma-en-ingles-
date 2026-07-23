import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { StaffCapability, UserRole } from '@prisma/client';
import { unauthenticated } from './errors';
import type { RequestWithUser } from './request';
import type { SessionUser } from './session';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY = 'allowPasswordChangePending';
export const AllowPasswordChangePending = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const CAPABILITIES_KEY = 'staffCapabilities';
export const Capabilities = (
  ...capabilities: StaffCapability[]
): MethodDecorator & ClassDecorator => SetMetadata(CAPABILITIES_KEY, capabilities);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) throw unauthenticated();
    return request.user;
  },
);
