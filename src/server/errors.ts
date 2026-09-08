export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'INSUFFICIENT_FUNDS'
  | 'RATE_LIMITED'
  | 'VALIDATION';

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  INSUFFICIENT_FUNDS: 402,
  RATE_LIMITED: 429,
  VALIDATION: 400,
};

// Services throw this. The route wrapper in @/lib/api-response turns it into JSON.
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  // Set on RATE_LIMITED; becomes the Retry-After header.
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number = DEFAULT_STATUS[code],
    options: { retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
