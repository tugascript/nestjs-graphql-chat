import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { LocalMessageType } from '../common/entities/gql/message.type';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dtos/change-password.input';
import { ConfirmEmailDto } from './dtos/confirm-email.dto';
import { ConfirmLoginDto } from './dtos/confirm-login.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { ResetEmailDto } from './dtos/reset-email.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

@Controller('api/auth')
@UseGuards(CustomThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/register')
  public async registerUser(
    @Body() registerDto: RegisterDto,
  ): Promise<LocalMessageType> {
    return this.authService.registerUser(registerDto);
  }

  @Public()
  @Post('/confirm-email')
  public async confirmEmail(
    @Res() res: Response,
    @Body() dto: ConfirmEmailDto,
  ): Promise<void> {
    const result = await this.authService.confirmEmail(res, dto);
    res.status(200).send(result);
  }

  @Public()
  @Post('/login')
  public async loginUser(
    @Res() res: Response,
    @Body() dto: LoginDto,
  ): Promise<void> {
    const result = await this.authService.loginUser(res, dto);
    res.status(200).send(result);
  }

  @Public()
  @Post('/confirm-login')
  public async confirmLogin(
    @Res() res: Response,
    @Body() dto: ConfirmLoginDto,
  ): Promise<void> {
    const result = await this.authService.confirmLogin(res, dto);
    res.status(200).send(result);
  }

  @Post('/logout')
  public logoutUser(@Res() res: Response): void {
    const message = this.authService.logoutUser(res);
    res.status(200).send(message);
  }

  @Public()
  @Post('/refresh-access')
  public async refreshAccessToken(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.authService.refreshAccessToken(req, res);
    res.status(200).send(result);
  }

  @Public()
  @Post('/reset-password-email')
  public async sendResetPasswordEmail(
    @Body() resetEmailDto: ResetEmailDto,
  ): Promise<LocalMessageType> {
    return this.authService.sendResetPasswordEmail(resetEmailDto);
  }

  @Public()
  @Post('/reset-password')
  public async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<LocalMessageType> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('/toggle-two-factor')
  public async changeTwoFactorAuth(
    @CurrentUser() userId: string,
  ): Promise<LocalMessageType> {
    return this.authService.changeTwoFactorAuth(userId);
  }

  @Post('/update-email')
  public async updateEmail(
    @Res() res: Response,
    @CurrentUser() userId: string,
    @Body() dto: LoginDto,
  ): Promise<void> {
    const result = await this.authService.updateEmail(res, userId, dto);
    res.status(200).send(result);
  }

  @Post('/update-password')
  public async updatePassword(
    @Res() res: Response,
    @CurrentUser() userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const result = await this.authService.updatePassword(res, userId, dto);
    res.status(200).send(result);
  }
}
