import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.accessToken || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
      passReqToCallback: true, // 👈 req অবজেক্ট পাওয়ার জন্য
    });
  }

  async validate(req: Request, payload: { sub: string; email: string; role?: string }) {
    // ⚡ 1. Check if Access Token is Blacklisted in Redis
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ||
     req?.cookies?.accessToken;
    if (token) {
      try {
        const isBlacklisted = await this.cacheManager.get(`auth:blacklist:${token}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked/logged out');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
      }
    }

    const cacheKey = `auth:user:${payload.email}`;

    let user: any = null;
    try {
      user = await this.cacheManager.get(cacheKey);
    }
    catch(err){
      user = null;
    }

    if (!user) {
      const dbUser = await this.prisma.user.findUnique({
        where: {id: payload.sub},
      });

      if(!dbUser){
        throw new UnauthorizedException('User no longer exists');
      }
      const {hashedPassword, hashedRefreshToken, ...safeUser } = dbUser;
      user = safeUser;
      try{
        await this.cacheManager.set(cacheKey, user, 900000);
      }
      catch(err){
        //ignore error
      }
    }

    return user;
  }
}
