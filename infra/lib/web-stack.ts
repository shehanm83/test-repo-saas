import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { CachePolicy, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { FunctionUrlOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Code,
  Function as LambdaFunction,
  FunctionUrlAuthType,
  InvokeMode,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export interface WebStackProps extends StackProps {
  stage: string;
  bucketArn: string;
  queueUrl: string;
}

const PARAMETER_NAMES = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "REPLICATE_API_TOKEN",
  "RECRAFT_API_KEY",
  "SENTRY_DSN",
];

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    for (const name of PARAMETER_NAMES) {
      new StringParameter(this, `Param${name}`, {
        parameterName: `/layertone/${props.stage}/${name}`,
        stringValue: "<placeholder — set via aws ssm put-parameter>",
        tier: ParameterTier.STANDARD,
      });
    }

    const bucket = Bucket.fromBucketArn(this, "ImportedBucket", props.bucketArn);

    const serverFn = new LambdaFunction(this, "WebServer", {
      functionName: `layertone-${props.stage}-web`,
      runtime: Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: Code.fromAsset("../apps/web/.open-next/server-functions/default"),
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        OBSERVABILITY: "sentry",
        SENTRY_ENVIRONMENT: props.stage,
        SQS_QUEUE_GENERATIONS: props.queueUrl,
      },
    });

    bucket.grantReadWrite(serverFn);
    serverFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: ["*"],
      }),
    );
    serverFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [`arn:aws:ssm:*:*:parameter/layertone/${props.stage}/*`],
      }),
    );
    serverFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    );

    const fnUrl = serverFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });

    new Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: new FunctionUrlOrigin(fnUrl),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED,
      },
    });
  }
}
