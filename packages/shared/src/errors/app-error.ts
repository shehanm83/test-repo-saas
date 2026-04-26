export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly httpStatus = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(`${code}: ${userMessage}`);
    this.name = "AppError";
  }
}
