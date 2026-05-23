import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";

export interface WorkerStackProps extends StackProps {
  stage: string;
  queueArn: string;
  bucketArn: string;
}

export class WorkerStack extends Stack {
  constructor(scope: Construct, id: string, props: WorkerStackProps) {
    super(scope, id, props);

    const queue = Queue.fromQueueArn(this, "ImportedQueue", props.queueArn);
    const bucket = Bucket.fromBucketArn(this, "ImportedBucket", props.bucketArn);

    const fn = new Function(this, "GenerationWorker", {
      functionName: `layertone-${props.stage}-worker`,
      runtime: Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: Code.fromAsset("../apps/worker/dist"),
      timeout: Duration.seconds(120),
      memorySize: 1536,
      environment: {
        OBSERVABILITY: "sentry",
        SENTRY_ENVIRONMENT: props.stage,
      },
    });

    fn.addEventSource(new SqsEventSource(queue, { batchSize: 1 }));
    bucket.grantReadWrite(fn);

    fn.addToRolePolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      }),
    );
    fn.addToRolePolicy(
      new PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    );
    fn.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [`arn:aws:ssm:*:*:parameter/layertone/${props.stage}/*`],
      }),
    );
  }
}
