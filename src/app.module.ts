import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApolloDriver } from '@nestjs/apollo';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { ChatsModule } from './chats/chats.module';
import { CommonModule } from './common/common.module';
import { CacheConfig } from './config/cache.config';
import { config } from './config/config';
import { GqlConfigService } from './config/graphql.config';
import { MikroOrmConfig } from './config/mikroorm.config';
import { validationSchema } from './config/validation';
import { EmailModule } from './email/email.module';
import { EncryptionModule } from './encryption/encryption.module';
import { MessagesModule } from './messages/messages.module';
import { PubsubModule } from './pubsub/pubsub.module';
import { RedisClientModule } from './redis-client/redis-client.module';
import { UsersModule } from './users/users.module';

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
      imports: [ConfigModule, AuthModule],
      driver: ApolloDriver,
      useClass: GqlConfigService,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    UsersModule,
    CommonModule,
    AuthModule,
    EmailModule,
    RedisClientModule,
    EncryptionModule,
    ChatsModule,
    MessagesModule,
    PubsubModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
  ],
  controllers: [AppController],
})
export class AppModule {}
