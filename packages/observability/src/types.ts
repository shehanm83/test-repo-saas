export interface Telemetry {
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
  startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
}
