
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();

        // Check if user exists and has a role
        if (!user || !user.roles) {
            return false;
        }

        // Check if user has at least one of the required roles
        // user.roles is expected to be an array of strings (e.g. ['admin', 'warehouse'])
        // or a single string depending on implementation. We'll handle array here for robustness.

        const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];

        return requiredRoles.some((role) =>
            userRoles.map(r => r.toString().toUpperCase()).includes(role.toString().toUpperCase())
        );
    }
}
