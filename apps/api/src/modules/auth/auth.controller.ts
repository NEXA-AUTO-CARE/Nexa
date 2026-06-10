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
import {
  ApiOperation,
  ApiResponse as ApiResponseDoc,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthIssueResult, AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SetupTokenDto } from './dto/setup-token.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetTokenDto } from './dto/reset-token.dto';

const REFRESH_COOKIE = 'nexa_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start signup: create pending user and dispatch OTP',
  })
  @ApiResponseDoc({
    status: 200,
    description: 'OTP issued (logged to API stdout in dev)',
    schema: { example: { ok: true } },
  })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP code and receive a short-lived setupToken',
  })
  @ApiResponseDoc({ status: 200, type: SetupTokenDto })
  @ApiResponseDoc({ status: 401, description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<SetupTokenDto> {
    return this.auth.verifyOtp(dto.identifier, dto.code);
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set initial password using setupToken; returns access + refresh',
  })
  @ApiResponseDoc({ status: 200, type: AuthResponseDto })
  async setPassword(
    @Body() dto: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.setPassword(dto.setupToken, dto.password);
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in with identifier (email or phone) + password',
  })
  @ApiResponseDoc({ status: 200, type: AuthResponseDto })
  @ApiResponseDoc({
    status: 401,
    description: 'Invalid credentials or unverified OTP',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.login(dto.identifier, dto.password);
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset: dispatch OTP to identifier',
  })
  @ApiResponseDoc({ status: 200, schema: { example: { ok: true } } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Public()
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP code and receive a short-lived resetToken',
  })
  @ApiResponseDoc({ status: 200, type: ResetTokenDto })
  @ApiResponseDoc({ status: 401, description: 'Invalid or expired OTP' })
  verifyResetOtp(@Body() dto: VerifyResetOtpDto): Promise<ResetTokenDto> {
    return this.auth.verifyResetOtp(dto.identifier, dto.code);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set new password using resetToken; returns access + refresh',
  })
  @ApiResponseDoc({ status: 200, type: AuthResponseDto })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.resetPassword(
      dto.resetToken,
      dto.newPassword,
    );
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token cookie and issue a new access token',
  })
  @ApiResponseDoc({ status: 200, type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.auth.refresh(cookieToken ?? '');
    this.setRefreshCookie(res, result);
    return result.response;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token and clear the cookie' })
  @ApiResponseDoc({ status: 200, schema: { example: { ok: true } } })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.auth.logout(cookieToken);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return result;
  }

  private setRefreshCookie(res: Response, result: AuthIssueResult): void {
    const isProd =
      this.config.getOrThrow<string>('app.nodeEnv') === 'production';
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      expires: result.refreshExpiresAt,
    });
  }
}
