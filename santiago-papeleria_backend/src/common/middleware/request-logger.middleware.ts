import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        const userAgent = req.get('user-agent') || '';
        const ip = req.ip || req.socket.remoteAddress || '';

        // Format: [Nest] 440  - 22/01/2026, 8:39:42 p. m.     LOG [HTTP] Incoming Request: GET /favicon.ico - IP: ::ffff:127.0.0.1 - UA: Mozilla/5.0...
        // NestJS default logger already allows us to log. To match the user's specific text structure:
        // "Incoming Request: GET /... - IP: ... - UA: ..."

        this.logger.log(
            `Incoming Request: ${method} ${originalUrl} - IP: ${ip} - UA: ${userAgent}`,
        );

        next();
    }
}
