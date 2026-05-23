import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface StorageStackProps extends StackProps {
  stage: string;
}

export class StorageStack extends Stack {
  readonly appBucket: Bucket;
  readonly globalBucket: Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.appBucket = new Bucket(this, "AppAssets", {
      bucketName: `layertone-app-${props.stage}-assets`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "expire-noncurrent",
          prefix: "workspaces/",
          noncurrentVersionExpiration: Duration.days(30),
        },
        {
          id: "abort-mpu",
          prefix: "workspaces/",
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
        {
          id: "expire-inspiration-stage",
          prefix: "workspaces/",
          tagFilters: { ttl: "24h" },
          expiration: Duration.days(1),
        },
      ],
    });

    this.globalBucket = new Bucket(this, "GlobalAssets", {
      bucketName: `layertone-app-${props.stage}-global`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
