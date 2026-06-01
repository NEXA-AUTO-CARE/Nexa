import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  readonly envName: string;
  readonly awsAccount: string;
  readonly awsRegion: string;
  readonly vpcId: string;
  readonly domainName?: string;
  readonly apiSubdomain?: string;
  readonly webSubdomain?: string;
}

export function getAppConfig(scope: cdk.App | cdk.Stack): AppConfig {
  const envName = scope.node.tryGetContext('envName') ?? 'production';
  const awsAccount = scope.node.tryGetContext('awsAccount') ?? process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012';
  const awsRegion = scope.node.tryGetContext('awsRegion') ?? process.env.CDK_DEFAULT_REGION ?? 'eu-west-2';
  
  // VPC lookup ID. Crucial to allow passing via context or .env
  const vpcId = scope.node.tryGetContext('vpcId') ?? process.env.AWS_VPC_ID ?? 'vpc-12345678';
  
  // Optional domain configurations
  const domainName = scope.node.tryGetContext('domainName');
  const apiSubdomain = scope.node.tryGetContext('apiSubdomain') ?? 'api';
  const webSubdomain = scope.node.tryGetContext('webSubdomain') ?? 'app';

  return {
    envName,
    awsAccount,
    awsRegion,
    vpcId,
    domainName,
    apiSubdomain,
    webSubdomain,
  };
}
