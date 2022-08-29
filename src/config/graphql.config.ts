import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { ApolloDriver } from '@nestjs/apollo';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import apolloResponseCache from 'apollo-server-plugin-response-cache';
import { Context } from 'graphql-ws';
import Keyv from 'keyv';
import { AuthService } from '../auth/auth.service';
import { IExtra } from './interfaces/extra.interface';

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  private readonly testing = this.configService.get<boolean>('testing');

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  public createGqlOptions(): any {
    return {
      driver: ApolloDriver,
      context: (all) => all,
      path: '/api/graphql',
      autoSchemaFile: './schema.gql',
      debug: this.configService.get<boolean>('testing'),
      sortSchema: true,
      bodyParserConfig: false,
      playground: this.testing,
      plugins: [apolloResponseCache({})],
      cors: {
        origin: this.configService.get<string>('url'),
        credentials: true,
      },
      cache: new KeyvAdapter(
        new Keyv(this.configService.get<string>('redisUrl'), {
          ttl: this.configService.get<number>('ttl'),
        }),
      ),
      subscriptions: {
        'graphql-ws': {
          onConnect: async (
            ctx: Context<{ authorization?: string }, IExtra>,
          ) => {
            const authHeader = ctx?.connectionParams?.authorization;

            if (!authHeader) return false;

            const authArr = authHeader.split(' ');

            if (authArr.length !== 2 || authArr[0] !== 'Bearer') return false;

            const result = await this.authService.generateWsSession(authArr[1]);

            if (!result) return false;

            const [userId, sessionId] = result;

            ctx.extra.user = {
              userId,
              sessionId,
            };
            return true;
          },
          onSubscribe: async (
            ctx: Context<{ authorization?: string }, IExtra>,
            message,
          ) => {
            ctx.extra.payload = message.payload;
          },
          onClose: async (ctx: Context<{ authorization?: string }, IExtra>) => {
            if (ctx.extra?.user)
              await this.authService.closeUserSession(ctx.extra.user);
          },
        },
      },
    };
  }
}
