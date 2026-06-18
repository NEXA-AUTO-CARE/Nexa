import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface ApiServiceStackProps extends cdk.StackProps {
  readonly config: AppConfig;
  readonly ecrRepository: ecr.IRepository;
  readonly photosBucket: s3.IBucket;
  readonly notificationTopic: sns.ITopic;
  readonly dbCredentialsSecret: secretsmanager.ISecret;
  readonly dbHost: string;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
}

export class ApiServiceStack extends cdk.Stack {
  public readonly fargateService: ecs.FargateService;
  public readonly loadBalancerDnsName: string;

  constructor(scope: Construct, id: string, props: ApiServiceStackProps) {
    super(scope, id, props);

    const { config, ecrRepository, photosBucket, notificationTopic, dbCredentialsSecret, dbHost } = props;

    // 1. Resolve VPC (conditional static mock in offline dev vs dynamic remote lookup in prod)
    let vpc: ec2.IVpc;
    if (config.vpcId === 'vpc-12345678') {
      vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
        vpcId: config.vpcId,
        availabilityZones: [`${this.region}a`, `${this.region}b`],
        isolatedSubnetIds: ['subnet-iso-1', 'subnet-iso-2'],
        privateSubnetIds: ['subnet-pri-1', 'subnet-pri-2'],
        publicSubnetIds: ['subnet-pub-1', 'subnet-pub-2'],
      });
    } else {
      vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcId: config.vpcId,
      });
    }

    // 2. Create an ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      clusterName: `nexa-cluster-${config.envName}`,
    });

    // 3. Create CloudWatch Log Group for NestJS API logs
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/ecs/nexa-api-${config.envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4. Create Fargate Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256, // 0.25 vCPU
    });

    // 5. Grant permissions to Fargate Task Execution Role & Task Role
    photosBucket.grantReadWrite(taskDefinition.taskRole);
    notificationTopic.grantPublish(taskDefinition.taskRole);
    dbCredentialsSecret.grantRead(taskDefinition.taskRole);

    // 6. Define the Container Definition
    const container = taskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'nexa-api',
        logGroup,
      }),
      environment: {
        NODE_ENV: config.envName,
        PORT: '3000',
        S3_ENDPOINT: `https://s3.${this.region}.amazonaws.com`,
        S3_BUCKET: photosBucket.bucketName,
        S3_REGION: this.region,
        S3_FORCE_PATH_STYLE: 'false',
        AWS_SNS_REGION: this.region,
        AWS_SNS_TOPIC_ARN: notificationTopic.topicArn,
        NOTIFICATION_SMS_PROVIDER: 'sns',
        DATABASE_HOST: dbHost,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'nexa',
        TWILIO_FROM: '+441234567890', // Default Twilio from number, can be overridden if needed
        SMTP_FROM: 'NEXA <no-reply@nexaautocare.com>',
        WEB_ORIGIN: config.domainName ? `https://${config.webSubdomain}.${config.domainName}` : 'https://d3dxi731daye4b.cloudfront.net',
        OTP_DEV_LOG: config.envName === 'development' ? 'true' : 'false',
        MOCK_PAYMENTS: 'false',
        SUPER_ADMIN_EMAIL: 'admin@nexaautocare.com', // Optional: customize based on env if needed
      },
      secrets: {
        // Safe injection of database password and username from Secrets Manager
        DATABASE_USER: ecs.Secret.fromSecretsManager(dbCredentialsSecret, 'username'),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(dbCredentialsSecret, 'password'),

        // JWT secrets
        JWT_ACCESS_SECRET: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'JwtAccessSecret', {
            secretName: `nexa/${config.envName}/jwt-access-secret`,
            description: 'JWT Access token secret',
          })
        ),
        JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'JwtRefreshSecret', {
            secretName: `nexa/${config.envName}/jwt-refresh-secret`,
            description: 'JWT Refresh token secret',
          })
        ),

        // S3 Credentials
        S3_KEY: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'S3CredentialsKeyRef', `nexa/${config.envName}/s3-credentials`),
          'accessKey'
        ),
        S3_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'S3SecretRef', `nexa/${config.envName}/s3-credentials`),
          'secretKey'
        ),

        // Stripe Credentials
        STRIPE_SECRET: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'StripeCredentials', {
            secretName: `nexa/${config.envName}/stripe-credentials`,
            description: 'Stripe API Credentials',
            generateSecretString: {
              secretStringTemplate: JSON.stringify({
                secretKey: 'replace_with_stripe_secret',
                webhookSecret: 'replace_with_stripe_webhook_secret',
              }),
              generateStringKey: 'secretKey',
            },
          }),
          'secretKey'
        ),
        STRIPE_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'StripeWebhookRef', `nexa/${config.envName}/stripe-credentials`),
          'webhookSecret'
        ),

        // Twilio Credentials
        TWILIO_SID: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'TwilioCredentials', {
            secretName: `nexa/${config.envName}/twilio-credentials`,
            description: 'Twilio API Credentials',
            generateSecretString: {
              secretStringTemplate: JSON.stringify({
                sid: 'replace_with_twilio_sid',
                token: 'replace_with_twilio_token',
              }),
              generateStringKey: 'sid',
            },
          }),
          'sid'
        ),
        TWILIO_TOKEN: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'TwilioTokenRef', `nexa/${config.envName}/twilio-credentials`),
          'token'
        ),

        // SMTP / SES Secrets
        SMTP_HOST: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'SmtpCredentials', {
            secretName: `nexa/${config.envName}/smtp-credentials`,
            description: 'SMTP credentials for SES emails',
            generateSecretString: {
              secretStringTemplate: JSON.stringify({
                host: 'email-smtp.eu-west-2.amazonaws.com',
                port: '587',
                user: 'replace_with_ses_smtp_user',
                pass: 'replace_with_ses_smtp_pass',
              }),
              generateStringKey: 'pass',
            },
          }),
          'host'
        ),
        SMTP_PORT: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'SmtpPortRef', `nexa/${config.envName}/smtp-credentials`),
          'port'
        ),
        SMTP_USER: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'SmtpUserRef', `nexa/${config.envName}/smtp-credentials`),
          'user'
        ),
        SMTP_PASS: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'SmtpPassRef', `nexa/${config.envName}/smtp-credentials`),
          'pass'
        ),

        // Ideal Postcodes API Key credentials
        IDEAL_POSTCODES_API_KEY: ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, 'IdealPostcodesCredentials', {
            secretName: `nexa/${config.envName}/postcodes-credentials`,
            description: 'Ideal Postcodes API Credentials',
            generateSecretString: {
              secretStringTemplate: JSON.stringify({
                apiKey: 'replace_with_ideal_postcodes_api_key',
              }),
              generateStringKey: 'apiKey',
            },
          }),
          'apiKey'
        ),
      },
      portMappings: [{ containerPort: 3000 }],
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 5,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // 7. Create Application Load Balanced Fargate Service
    const albfg = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      taskDefinition,
      desiredCount: 1, // 1 task for minimal cost, can scale up automatically!
      publicLoadBalancer: true, // Public-facing ALB in public subnets
      assignPublicIp: false, // Tasks in private subnets, no public IP
      taskSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Placement in private subnets with NAT gateway egress
      },
      listenerPort: 80,
      serviceName: `nexa-api-${config.envName}`,
      healthCheckGracePeriod: cdk.Duration.seconds(120), // Allow 2 min for cold-start before ALB checks
    });

    // Configure health check paths on ALB target group
    albfg.targetGroup.configureHealthCheck({
      path: '/api/health',
      port: '3000',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    });

    this.fargateService = albfg.service;
    this.loadBalancerDnsName = albfg.loadBalancer.loadBalancerDnsName;

    // Define security group ingress rule in this child stack to avoid cyclic dependency
    new ec2.CfnSecurityGroupIngress(this, 'DatabaseIngressFromFargate', {
      groupId: props.dbSecurityGroup.securityGroupId,
      sourceSecurityGroupId: this.fargateService.connections.securityGroups[0].securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      description: 'Allow inbound PostgreSQL traffic from Nexa API Fargate tasks',
    });

    new cdk.CfnOutput(this, 'ServiceUrl', {
      value: albfg.loadBalancer.loadBalancerDnsName,
      description: 'The DNS name of the Application Load Balancer',
    });
  }
}
