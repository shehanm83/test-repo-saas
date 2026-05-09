import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { QueueAdapter, QueueMessage } from "@vyora/shared";

export class SqsQueueAdapter implements QueueAdapter {
  client: SQSClient;

  constructor(opts: {
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.client = new SQSClient({
      region: opts.region,
      ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
      ...(opts.accessKeyId && opts.secretAccessKey
        ? { credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey } }
        : {}),
    });
  }

  async send<T>(queueUrl: string, body: T, opts?: { idempotencyKey?: string }): Promise<void> {
    const fifoParams =
      opts?.idempotencyKey && isFifoQueue(queueUrl)
        ? {
            MessageDeduplicationId: opts.idempotencyKey,
            MessageGroupId: "default",
          }
        : {};

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
        ...fifoParams,
      }),
    );
  }

  async receive<T>(queueUrl: string, max = 1): Promise<QueueMessage<T>[]> {
    const r = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: max,
        WaitTimeSeconds: 5,
        VisibilityTimeout: 60,
      }),
    );
    return (r.Messages ?? []).map((m) => ({
      body: JSON.parse(m.Body ?? "{}") as T,
      receiptHandle: m.ReceiptHandle!,
      approximateReceiveCount: parseInt(
        m.Attributes?.ApproximateReceiveCount ?? "1",
        10,
      ),
    }));
  }

  async delete(queueUrl: string, receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }),
    );
  }
}

function isFifoQueue(queueUrl: string): boolean {
  return queueUrl.endsWith(".fifo");
}
