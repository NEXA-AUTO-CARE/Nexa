import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { AppConfig } from './config';

interface DnsStackProps extends cdk.StackProps {
  readonly config: AppConfig;
}

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    const domainName = props.config.domainName!;

    // 1. Create Route 53 Public Hosted Zone
    const hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: domainName,
      comment: `Hosted zone for ${domainName} - Nexa Auto Care`,
    });
    this.hostedZone = hostedZone;

    // 2. Create ACM Certificate in us-east-1 (required by CloudFront)
    // Uses a Lambda-backed custom resource to provision the certificate
    // in us-east-1 and auto-validate via Route 53 DNS records.
    // Note: DnsValidatedCertificate is deprecated in favour of cross-region
    // stack references, but remains the simplest single-stack approach for
    // creating a us-east-1 certificate from any region.
    this.certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      hostedZone: hostedZone,
      region: 'us-east-1',
      cleanupRoute53Records: true,
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: hostedZone.hostedZoneId,
      description: 'Route 53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers!),
      description: 'Update Namecheap Custom DNS with these nameservers',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN in us-east-1',
    });
  }
}
