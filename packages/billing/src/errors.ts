export class InsufficientCredits extends Error {
  constructor(
    public readonly balance: number,
    public readonly requested: number,
  ) {
    super(`insufficient credits: have ${balance}, need ${requested}`);
    this.name = "InsufficientCredits";
  }
}

export class IdempotencyConflict extends Error {
  constructor(public readonly key: string) {
    super(`idempotency key already used: ${key}`);
    this.name = "IdempotencyConflict";
  }
}
