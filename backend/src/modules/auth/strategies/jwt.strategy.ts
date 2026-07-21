import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  // টোকেনটি ভ্যালিড হলে Passport স্বয়ংক্রিয়ভাবে এই মেথডটি কল করে এবং ডিকোড করা পেলোড পাস করে
  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // পাসওয়ার্ড ও রিফ্রেশ টোকেন বাদ দিয়ে ইউজার অবজেক্ট পাঠানো, যা req.user-এ অ্যাসাইন হবে
    const { hashedPassword, hashedRefreshToken, ...userWithoutSecrets } = user;
    return userWithoutSecrets;
  }
}
