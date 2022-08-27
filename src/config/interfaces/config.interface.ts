import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { RedisOptions } from 'ioredis';
import { IEmailConfig } from './email-config.interface';
import { IJwt } from './jwt.interface';

export interface IConfig {
  port: number;
  playground: boolean;
  url: string;
  db: MikroOrmModuleOptions;
  jwt: IJwt;
  emailService: IEmailConfig;
  redis: RedisOptions;
  ttl: number;
  testing: boolean;
  sessionTime: number;
  throttler: ThrottlerModuleOptions;
  redisUrl: string;
}
