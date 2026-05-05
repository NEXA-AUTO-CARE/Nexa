import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('app.webOrigin'),
    credentials: true,
  });
  app.setGlobalPrefix('api', { exclude: ['/'] });

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[nexa-api] listening on http://localhost:${port}`);
}
bootstrap();
