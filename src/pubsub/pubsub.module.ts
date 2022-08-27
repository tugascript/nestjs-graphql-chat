import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RedisOptions } from 'ioredis';

export const PUB_SUB = 'PUB_SUB';

@Global()
@Module({
  providers: [
    {
      provide: PUB_SUB,
      useFactory: (configService: ConfigService) =>
        new RedisPubSub({
          connection: configService.get<RedisOptions>('redis'),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PUB_SUB],
})
export class PubsubModule {}
