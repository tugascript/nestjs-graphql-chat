import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { CommonModule } from './common/common.module';
import { CacheConfig } from './config/cache.config';
import { config } from './config/config';
import { GqlConfigService } from './config/graphql.config';
import { MikroOrmConfig } from './config/mikroorm.config';
import { GraphQLDriver } from './config/utils/graphql.driver';
import { validationSchema } from './config/validation';
import { EmailModule } from './email/email.module';
import { UploaderModule } from './uploader/uploader.module';
import { UsersModule } from './users/users.module';
import { LoadersModule } from './loaders/loaders.module';
import { RedisClientModule } from './redis-client/redis-client.module';
import { EncryptionModule } from './encryption/encryption.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [config],
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MikroOrmConfig,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useClass: CacheConfig,
    }),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule, AuthModule, LoadersModule],
      driver: GraphQLDriver,
      useClass: GqlConfigService,
    }),
    UsersModule,
    CommonModule,
    AuthModule,
    EmailModule,
    UploaderModule,
    LoadersModule,
    RedisClientModule,
    EncryptionModule,
    ChatsModule,
    MessagesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
