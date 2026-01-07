import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No token provided');
        }

        const token = authHeader.replace('Bearer ', '');
        try {
            const secret = this.configService.get<string>('JWT_SECRET', 'fallback-dev-secret-change-in-production');
            const decoded = jwt.verify(token, secret);
            request.user = decoded; // Attach user payload to request
            return true;
        } catch (e) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
