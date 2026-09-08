const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Exponential backoff for calls that are safe to repeat.
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const { attempts = 3, baseDelayMs = 400, shouldRetry = () => true } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !shouldRetry(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
