import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Request } from 'express';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    private cacheManager;
    constructor(configService: ConfigService, prisma: PrismaService, cacheManager: Cache);
    validate(req: Request, payload: {
        sub: string;
        email: string;
        role?: string;
    }): Promise<any>;
}
export {};
