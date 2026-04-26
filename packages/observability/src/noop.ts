import type { Telemetry } from "./types";

export class NoopTelemetry implements Telemetry {
  captureException(): void {}
  metric(): void {}
  async startSpan<T>(_name: string, fn: () => Promise<T> | T): Promise<T> {
    return fn();
  }
}
