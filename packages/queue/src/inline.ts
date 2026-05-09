import type { QueueAdapter, QueueMessage } from "@vyora/shared";

type Handler = (msg: unknown) => Promise<void>;

export class InlineQueueAdapter implements QueueAdapter {
  private handlers = new Map<string, Handler>();

  registerHandler(queueUrl: string, h: Handler): void {
    this.handlers.set(queueUrl, h);
  }

  async send<T>(queueUrl: string, body: T): Promise<void> {
    const h = this.handlers.get(queueUrl);
    if (!h) throw new Error(`no inline handler registered for ${queueUrl}`);
    // Fire-and-forget: return immediately so the HTTP response isn't blocked.
    // The handler runs in the background; errors are logged to stderr.
    void h(body).catch((e: unknown) => console.error("[inline-queue] handler error:", e));
  }

  async receive<T>(_queueUrl: string, _max?: number): Promise<QueueMessage<T>[]> {
    return [];
  }

  async delete(_queueUrl: string, _receiptHandle: string): Promise<void> {
    // noop
  }
}
