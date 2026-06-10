import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from './database/entities';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../.env'), override: false });

// Prefer individual params to avoid URIError when passwords contain special chars.
// Falls back to parsing DATABASE_URL only if individual params are absent.
const rawUrl = process.env.DATABASE_URL ?? '';
const useIndividual = !!(
  process.env.DATABASE_HOST &&
  process.env.DATABASE_USER &&
  process.env.DATABASE_PASSWORD
);

const requiresSsl =
  useIndividual ||
  /[?&]sslmode=(require|prefer|verify-ca|verify-full|no-verify)/i.test(
    rawUrl,
  ) ||
  /[?&]ssl=true/i.test(rawUrl);
export const AppDataSource = new DataSource(
  useIndividual
    ? {
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: { rejectUnauthorized: false },
        entities: Object.values(entities),
        migrations: [resolve(__dirname, 'database/migrations/*.{ts,js}')],
        migrationsTableName: 'migrations',
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        logging: process.env.TYPEORM_LOGGING === 'true',
      }
    : {
        type: 'postgres',
        // Strip sslmode/ssl params — pg parses them and overrides the explicit ssl option
        url: rawUrl
          .replace(/([?&])(sslmode|ssl)=[^&]*&?/gi, '$1')
          .replace(/[?&]$/, ''),
        ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
        entities: Object.values(entities),
        migrations: [resolve(__dirname, 'database/migrations/*.{ts,js}')],
        migrationsTableName: 'migrations',
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        logging: process.env.TYPEORM_LOGGING === 'true',
      },
);
