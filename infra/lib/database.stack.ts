import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface DatabaseStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class DatabaseStack extends cdk.Stack {
  public readonly databaseInstance: rds.DatabaseInstance;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly credentialsSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config } = props;

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

    // 2. Create a Security Group for the database
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Nexa PostgreSQL RDS database',
      allowAllOutbound: true,
    });

    // 3. Define the database credentials (auto-generated in Secrets Manager)
    this.credentialsSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: `nexa/${config.envName}/database-credentials`,
      description: 'Nexa Database master credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'nexa' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\ ',
      },
    });

    // 4. Instantiate the RDS PostgreSQL instance
    this.databaseInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO // Cost-efficient for start, can scale to MEDIUM/LARGE easily
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Secure placement in private subnets with NAT gateway
      },
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.credentialsSecret),
      databaseName: 'nexa',
      allocatedStorage: 20, // 20 GB standard
      maxAllocatedStorage: 100, // Autoscaling up to 100 GB
      backupRetention: cdk.Duration.days(0),
      deletionProtection: config.envName === 'production',
      removalPolicy: config.envName === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Output values for convenience
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.databaseInstance.dbInstanceEndpointAddress,
      description: 'RDS Database endpoint address',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.credentialsSecret.secretArn,
      description: 'Secrets Manager Secret ARN for DB credentials',
    });
  }
}
