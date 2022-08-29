import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { altairExpress } from 'altair-express-middleware';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.enableCors({
    credentials: true,
    origin: configService.get<string>('url'),
  });
  app.use(json());
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));
  const port = configService.get<number>('port');
  app.use(
    '/altair',
    altairExpress({
      endpointURL: '/api/graphql',
    }),
  );
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port);
}

bootstrap();
