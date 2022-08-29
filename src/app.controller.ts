import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Public } from './auth/decorators/public.decorator';

// Because of nginx
@Controller()
export class AppController {
  private readonly port = this.configService.get<number>('port');

  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get('/favicon.ico')
  public getFavicon(@Res() res: Response) {
    res.send('/favicon.ico');
  }
}
