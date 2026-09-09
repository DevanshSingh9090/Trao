const lastRequestByHost = new Map<string, number>();

const MIN_DELAY_MS = Number(
  process.env.RETRIEVAL_MIN_DELAY_MS || 500
);

export async function waitForHost(
  hostname: string
): Promise<void> {
  const now = Date.now();
  const lastRequest =
    lastRequestByHost.get(hostname) || 0;

  const elapsed = now - lastRequest;

  if (elapsed < MIN_DELAY_MS) {
    await sleep(MIN_DELAY_MS - elapsed);
  }

  lastRequestByHost.set(hostname, Date.now());
}

export async function withBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const delay =
        500 * Math.pow(2, attempt);

      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}