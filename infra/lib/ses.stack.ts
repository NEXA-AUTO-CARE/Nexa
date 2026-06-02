import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface SesStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class SesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SesStackProps) {
    super(scope, id, props);

    const domainName = props.config.domainName || 'nexaautocare.com';
    const mailFromDomain = `bounce.${domainName}`;

    // Note: The Domain Identity is managed manually in the AWS Console.
    // To set up the custom MAIL FROM domain (bounce.nexaautocare.com), 
    // go to the SES Console -> nexaautocare.com -> Custom MAIL FROM domain -> Edit.

    // 2. Create an IAM User for SMTP credentials
    // Note: The actual credentials should be generated in the console or via CLI 
    // to get the SMTP password format, or managed via Secrets Manager.
    const smtpUser = new iam.User(this, 'SmtpUser', {
      userName: `nexa-smtp-user-${props.config.envName}`,
    });

    // Grant the user permission to send emails
    smtpUser.addToPolicy(new iam.PolicyStatement({
      actions: ['ses:SendRawEmail', 'ses:SendEmail'],
      resources: ['*'], // Can be restricted to the specific identity ARN
    }));

    // Outputs to guide the user on DNS records
    new cdk.CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'The domain verified in SES',
    });

    new cdk.CfnOutput(this, 'MailFromDomain', {
      value: mailFromDomain,
      description: 'The custom MAIL FROM domain. Add MX and TXT (SPF) records for this in Namecheap.',
    });

    new cdk.CfnOutput(this, 'NextSteps', {
      value: 'Go to AWS SES Console -> Identities -> nexaautocare.com to get the 3 CNAME DKIM records for Namecheap.',
    });
  }
}
