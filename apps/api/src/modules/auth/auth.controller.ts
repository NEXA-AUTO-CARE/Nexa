import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthResponse } from '@nexa/shared';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthIssueResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const REFRESH_COOKIE = 'nexa_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.identifier, dto.code);
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Body() dto: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.setPassword(dto.setupToken, dto.password);
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.login(dto.identifier, dto.password);
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.auth.refresh(cookieToken ?? '');
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.auth.logout(cookieToken);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return result;
  }

  private setRefreshCookie(res: Response, result: AuthIssueResult): void {
    const isProd = this.config.getOrThrow<string>('app.nodeEnv') === 'production';
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      expires: result.refreshExpiresAt,
    });
  }
}
