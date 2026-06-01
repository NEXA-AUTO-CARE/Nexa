import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface EcrStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const { config } = props;

    // 1. Create ECR repository for the NestJS API
    this.repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: `nexa-api-${config.envName}`,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: config.envName === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // 2. Add Lifecycle rules to prune old images and save storage costs
    this.repository.addLifecycleRule({
      maxImageCount: 15,
      description: 'Keep only the last 15 built images',
    });

    this.repository.addLifecycleRule({
      tagStatus: ecr.TagStatus.UNTAGGED,
      maxImageAge: cdk.Duration.days(7),
      description: 'Prune untagged images older than 7 days',
    });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'The URI of the ECR repository for the API container',
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'The ARN of the ECR repository',
    });
  }
}
