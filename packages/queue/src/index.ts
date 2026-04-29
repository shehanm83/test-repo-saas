export { SqsQueueAdapter } from "./sqs";
export { InlineQueueAdapter } from "./inline";

import { SqsQueueAdapter } from "./sqs";
import { InlineQueueAdapter } from "./inline";
import type { QueueAdapter } from "@vyora/shared";

export function createQueueAdapter(config: {
  mode: "sqs" | "elasticmq" | "inline";
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): QueueAdapter {
  if (config.mode === "inline") return new InlineQueueAdapter();
  return new SqsQueueAdapter({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.accessKeyId ? { accessKeyId: config.accessKeyId } : {}),
    ...(config.secretAccessKey ? { secretAccessKey: config.secretAccessKey } : {}),
  });
}
