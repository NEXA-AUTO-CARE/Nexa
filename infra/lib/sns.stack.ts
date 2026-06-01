import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface SnsStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class SnsStack extends cdk.Stack {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: SnsStackProps) {
    super(scope, id, props);

    const { config } = props;

    // 1. Create a custom KMS key for encrypting the SNS Topic (Server-Side Encryption)
    const snsKey = new kms.Key(this, 'SnsTopicKey', {
      alias: `alias/nexa-${config.envName}-sns-key`,
      description: 'KMS Key for encrypting Nexa SNS Notification Topic',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Can be destroyed as we don't have persistent state here
    });

    // 2. Create the SNS Topic
    this.topic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `nexa-notifications-${config.envName}`,
      displayName: `Nexa ${config.envName} Notifications`,
      masterKey: snsKey, // Enforce SSE
    });

    new cdk.CfnOutput(this, 'TopicArn', {
      value: this.topic.topicArn,
      description: 'The ARN of the SNS notification topic',
    });

    new cdk.CfnOutput(this, 'TopicName', {
      value: this.topic.topicName,
      description: 'The name of the SNS notification topic',
    });
  }
}
