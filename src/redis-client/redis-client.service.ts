import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'redis-om';

@Injectable()
export class RedisClientService extends Client implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    super();
    (async () => {
      await this.open(configService.get<string>('redisUrl'));
    })();
  }

  public async onModuleDestroy() {
    await this.close();
  }
}
