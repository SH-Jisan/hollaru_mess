import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ১. মেম্বার রেজিস্ট্রেশন লজিক
  async register(dto: RegisterDto) {
    // ইমেইলটি অলরেডি ডাটাবেজে আছে কিনা চেক করা
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // পাসওয়ার্ড হ্যাশ করা (Bcrypt)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // ডাটাবেজে ইউজার সেভ করা
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // নতুন ইউজারের জন্য টোকেন জেনারেট করা
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  // ২. লগইন ভেরিফিকেশন লজিক
  async login(dto: LoginDto) {
    // ইউজার খুঁজে বের করা
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // পাসওয়ার্ড চেক করা
    const isPasswordValid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // টোকেন জেনারেট এবং ডাটাবেজ আপডেট
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    // সেনসিটিভ ডাটা বাদ দিয়ে রেসপন্স পাঠানো
    const { hashedPassword, hashedRefreshToken, ...userWithoutSecrets } = user;
    return { user: userWithoutSecrets, ...tokens };
  }

  // ৩. টোকেন রিফ্রেশ করার লজিক (Refresh Token Strategy)
  async refresh(dto: RefreshDto) {
    try {
      // টোকেনটি ডিকোড করে এর ভ্যালিডিটি এবং পেলোড বের করা
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // ডাটাবেজে রিফ্রেশ টোকেন মিলিয়ে দেখা
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Access denied');
      }

      // ক্লায়েন্টের পাঠানো টোকেন এবং ডাটাবেজের টোকেন ম্যাচ করা
      const isTokenMatch = await bcrypt.compare(dto.refreshToken, user.hashedRefreshToken);
      if (!isTokenMatch) {
        throw new UnauthorizedException('Access denied');
      }

      // নতুন টোকেন পেয়ার জেনারেট করা
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ৪. টোকেন জেনারেশন হেল্পার মেথড
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      // Access Token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') as any,
      }),
      // Refresh Token
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ৫. ডাটাবেজে রিফ্রেশ টোকেন হ্যাশ করে সেভ করার হেল্পার
  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}
