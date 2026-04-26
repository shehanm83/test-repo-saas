import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";

export interface QueueStackProps extends StackProps {
  stage: string;
}

export class QueueStack extends Stack {
  readonly mainQueue: Queue;
  readonly captionsQueue: Queue;
  readonly dlq: Queue;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    this.dlq = new Queue(this, "GenerationsDLQ", {
      queueName: `studio-${props.stage}-generations-dlq`,
      retentionPeriod: Duration.days(14),
    });

    this.mainQueue = new Queue(this, "GenerationsQueue", {
      queueName: `studio-${props.stage}-generations`,
      visibilityTimeout: Duration.seconds(180),
      deadLetterQueue: { queue: this.dlq, maxReceiveCount: 3 },
    });

    this.captionsQueue = new Queue(this, "CaptionsQueue", {
      queueName: `studio-${props.stage}-captions`,
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: { queue: this.dlq, maxReceiveCount: 3 },
    });
  }
}
