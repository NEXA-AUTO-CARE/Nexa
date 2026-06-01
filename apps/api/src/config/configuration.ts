import { EnvSchema } from './env.validation';

export interface AppConfig {
  nodeEnv: EnvSchema['NODE_ENV'];
  port: number;
  webOrigin: string;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  s3: {
    endpoint: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    region: string;
    forcePathStyle: boolean;
  };
  stripe: {
    secret?: string;
    webhookSecret?: string;
  };
  twilio: {
    sid?: string;
    token?: string;
    from?: string;
  };
  sns: {
    region?: string;
    topicArn?: string;
    smsProvider?: string;
  };
  smtp: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
  };
  flags: {
    otpDevLog: boolean;
    mockPayments: boolean;
  };
  bootstrap: {
    superAdminEmail: string | null;
  };
}

export default (): { app: AppConfig } => {
  const env = process.env as unknown as EnvSchema;
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: Number(env.PORT) || 3000,
      webOrigin: env.WEB_ORIGIN,
      databaseUrl: env.DATABASE_URL!,
      jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessTtl: Number(env.JWT_ACCESS_TTL),
        refreshTtl: Number(env.JWT_REFRESH_TTL),
      },
      s3: {
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET,
        accessKey: env.S3_KEY,
        secretKey: env.S3_SECRET,
        region: env.S3_REGION,
        forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE),
      },
      stripe: {
        secret: env.STRIPE_SECRET,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      },
      twilio: {
        sid: env.TWILIO_SID,
        token: env.TWILIO_TOKEN,
        from: env.TWILIO_FROM,
      },
      sns: {
        region: env.AWS_SNS_REGION,
        topicArn: env.AWS_SNS_TOPIC_ARN,
        smsProvider: env.NOTIFICATION_SMS_PROVIDER,
      },
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM,
      },
      flags: {
        otpDevLog: Boolean(env.OTP_DEV_LOG),
        mockPayments: Boolean(env.MOCK_PAYMENTS),
      },
      bootstrap: {
        superAdminEmail: env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null,
      },
    },
  };
};
