import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawUrl = config.getOrThrow<string>('app.databaseUrl');
        const requiresSsl =
          /[?&]sslmode=(require|prefer|verify-ca|verify-full|no-verify)/i.test(rawUrl) ||
          /[?&]ssl=true/i.test(rawUrl) ||
          process.env.NODE_ENV === 'production';

        // Parse connection parameters from the URL to pass them individually.
        // This is 100% reliable and bypasses any url parsing issues in the pg driver when combined with ssl options.
        const parsed = new URL(rawUrl);

        return {
          type: 'postgres' as const,
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 5432,
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          database: parsed.pathname.substring(1),
          ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
          entities: Object.values(entities),
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: false,
          autoLoadEntities: false,
          logging: process.env.TYPEORM_LOGGING === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
