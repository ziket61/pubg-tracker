export class PubgApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "PubgApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotFoundError extends PubgApiError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends PubgApiError {
  constructor(retryAfter = 60) {
    super("Rate limit reached", 429, retryAfter);
    this.name = "RateLimitError";
  }
}

export class MissingKeyError extends PubgApiError {
  constructor() {
    super("PUBG_API_KEY is not set", 401);
    this.name = "MissingKeyError";
  }
}
