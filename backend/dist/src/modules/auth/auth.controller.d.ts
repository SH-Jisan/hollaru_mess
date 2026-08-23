import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    login(loginDto: LoginDto, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    refresh(refreshDto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: {
        id: string;
        email: string;
    }, req: Request, res: Response): Promise<{
        message: string;
    }>;
    logoutAll(user: {
        id: string;
        email: string;
    }, req: Request, res: Response): Promise<{
        message: string;
    }>;
    private setRefreshTokenCookie;
}
