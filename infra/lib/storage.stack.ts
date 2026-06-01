import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface StorageStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class StorageStack extends cdk.Stack {
  public readonly photosBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { config } = props;

    // 1. Create S3 Bucket for vehicle/booking photos
    this.photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      bucketName: `nexa-photos-${config.envName}-${props.env?.account}-${props.env?.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Secure by default
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [
            '*', // For production, replace with specific domain names or the cloudfront distribution origin
          ],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          // Clean up incomplete multipart uploads after 7 days to save costs
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      removalPolicy: config.envName === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.envName !== 'production',
    });

    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: this.photosBucket.bucketName,
      description: 'The name of the S3 bucket for photos',
    });

    new cdk.CfnOutput(this, 'PhotosBucketArn', {
      value: this.photosBucket.bucketArn,
      description: 'The ARN of the S3 bucket for photos',
    });
  }
}
