import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL: number = 900;

  @IsInt()
  @Min(60)
  JWT_REFRESH_TTL: number = 2_592_000;

  @IsString()
  S3_ENDPOINT: string;

  @IsString()
  S3_BUCKET: string;

  @IsString()
  S3_KEY: string;

  @IsString()
  S3_SECRET: string;

  @IsString()
  S3_REGION: string = 'us-east-1';

  @IsBoolean()
  S3_FORCE_PATH_STYLE: boolean = true;

  @IsString()
  @IsOptional()
  STRIPE_SECRET?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  TWILIO_SID?: string;

  @IsString()
  @IsOptional()
  TWILIO_TOKEN?: string;

  @IsString()
  @IsOptional()
  TWILIO_FROM?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsInt()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  WEB_ORIGIN: string = 'http://localhost:5173';

  @IsBoolean()
  OTP_DEV_LOG: boolean = true;

  @IsBoolean()
  MOCK_PAYMENTS: boolean = false;
}

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });
  if (errors.length > 0) {
    const message = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${message}`);
  }
  return validated;
}
