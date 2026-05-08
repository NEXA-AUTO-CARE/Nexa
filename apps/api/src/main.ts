import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nexa API')
    .setDescription(
      'Marketplace API for the Nexa car-detailing platform (Aberdeen MVP). ' +
        'All routes are JWT-protected by default; use the bearer auth scheme below ' +
        'to authorize requests after calling /auth/login.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'jwt',
    )
    .addCookieAuth('nexa_rt', { type: 'apiKey', in: 'cookie' }, 'refresh-cookie')
    .addTag('auth', 'Signup, OTP verification, login, refresh, logout')
    .addTag('users', 'Current user profile')
    .addTag('admin/roles', 'Role and permission management (super_admin only)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[nexa-api] listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[nexa-api] OpenAPI docs at http://localhost:${port}/api/docs`);
}
bootstrap();
