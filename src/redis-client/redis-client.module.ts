import { Global, Module } from '@nestjs/common';
import { RedisClientService } from './redis-client.service';

@Global()
@Module({
  providers: [RedisClientService],
  exports: [RedisClientService],
})
export class RedisClientModule {}
