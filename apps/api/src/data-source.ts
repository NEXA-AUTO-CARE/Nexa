import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as entities from './database/entities';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../.env'), override: false });

const rawUrl = process.env.DATABASE_URL ?? '';
const requiresSsl = /[?&]sslmode=(require|prefer|verify-ca|verify-full|no-verify)/i.test(rawUrl) || /[?&]ssl=true/i.test(rawUrl);
// Strip sslmode/ssl query params: pg parses them itself and overrides the explicit `ssl` option,
// which prevents `rejectUnauthorized: false` from taking effect against self-signed chains.
const url = rawUrl.replace(/([?&])(sslmode|ssl)=[^&]*&?/gi, '$1').replace(/[?&]$/, '');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  entities: Object.values(entities),
  migrations: [resolve(__dirname, 'database/migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
