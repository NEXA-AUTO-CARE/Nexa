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
          /[?&]ssl=true/i.test(rawUrl);
        // Strip sslmode/ssl query params so pg uses our explicit `ssl` option instead.
        const url = rawUrl.replace(/([?&])(sslmode|ssl)=[^&]*&?/gi, '$1').replace(/[?&]$/, '');
        return {
          type: 'postgres' as const,
          url,
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
