#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getAppConfig } from '../lib/config';
import { EcrStack } from '../lib/ecr.stack';
import { DatabaseStack } from '../lib/database.stack';
import { StorageStack } from '../lib/storage.stack';
import { SnsStack } from '../lib/sns.stack';
import { SesStack } from '../lib/ses.stack';
import { ApiServiceStack } from '../lib/api-service.stack';
import { FrontendStack } from '../lib/frontend.stack';

const app = new cdk.App();

// 1. Resolve configuration parameters from context or environment
const config = getAppConfig(app);

// Environment structure for Stack deployment
const env: cdk.Environment = {
  account: config.awsAccount,
  region: config.awsRegion,
};

// 2. Define the ECR Stack (for building/pushing container images)
const ecrStack = new EcrStack(app, `NexaEcrStack-${config.envName}`, {
  env,
  config,
  description: 'ECR Container Repository for Nexa API',
});

// 3. Define the Database Stack (RDS PostgreSQL)
const databaseStack = new DatabaseStack(app, `NexaDatabaseStack-${config.envName}`, {
  env,
  config,
  description: 'Isolated Database Stack for Nexa',
});

// 4. Define the Storage Stack (S3 Bucket)
const storageStack = new StorageStack(app, `NexaStorageStack-${config.envName}`, {
  env,
  config,
  description: 'S3 Storage Buckets for Nexa assets',
});

// 5. Define the SNS Stack (SNS Topic for notifications)
const snsStack = new SnsStack(app, `NexaSnsStack-${config.envName}`, {
  env,
  config,
  description: 'SNS Notification Topics for Nexa',
});

// 5b. Define the SES Stack (SES Domain Identity and SMTP)
const sesStack = new SesStack(app, `NexaSesStack-${config.envName}`, {
  env,
  config,
  description: 'SES Configuration for Nexa Email Delivery',
});

// 6. Define the API Service Stack (ECS Fargate + ALB)
// Connects to RDS, S3, SNS, and pulls image from ECR
const apiServiceStack = new ApiServiceStack(app, `NexaApiServiceStack-${config.envName}`, {
  env,
  config,
  ecrRepository: ecrStack.repository,
  photosBucket: storageStack.photosBucket,
  notificationTopic: snsStack.topic,
  dbCredentialsSecret: databaseStack.credentialsSecret,
  dbHost: databaseStack.databaseInstance.dbInstanceEndpointAddress,
  dbSecurityGroup: databaseStack.dbSecurityGroup,
  description: 'ECS Fargate compute and routing infrastructure for Nexa NestJS API',
});

// Ensure API service only attempts to launch after the database is fully provisioned
apiServiceStack.addDependency(databaseStack);
apiServiceStack.addDependency(ecrStack);
apiServiceStack.addDependency(storageStack);
apiServiceStack.addDependency(snsStack);

// 7. Define the Frontend Stack (S3 Bucket + CloudFront CDN)
const frontendStack = new FrontendStack(app, `NexaFrontendStack-${config.envName}`, {
  env,
  config,
  apiLoadBalancerDnsName: apiServiceStack.loadBalancerDnsName,
  description: 'S3 Static website hosting and CloudFront CDN for Nexa React frontend',
});

app.synth();
