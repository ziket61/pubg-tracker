// Simple in-process token bucket — guards against the 10 RPM PUBG API limit.
// Note: works only inside a single Node process. For horizontal scale, use Redis.

const CAPACITY = 10;
const REFILL_MS = 60_000;

let tokens = CAPACITY;
let lastRefill = Date.now();

const queue: Array<() => void> = [];

function refill() {
  const now = Date.now();
  const elapsed = now - lastRefill;
  if (elapsed >= REFILL_MS) {
    tokens = CAPACITY;
    lastRefill = now;
  }
}

function flushQueue() {
  while (tokens > 0 && queue.length > 0) {
    tokens -= 1;
    const next = queue.shift();
    next?.();
  }
}

function nextRefillIn() {
  return Math.max(0, REFILL_MS - (Date.now() - lastRefill));
}

export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  return fn();
}

function acquire(): Promise<void> {
  refill();
  if (tokens > 0) {
    tokens -= 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    queue.push(resolve);
    const wait = nextRefillIn() + 50;
    setTimeout(() => {
      refill();
      flushQueue();
    }, wait);
  });
}

export function getRateLimitState() {
  refill();
  return {
    tokens,
    queued: queue.length,
    msUntilRefill: nextRefillIn(),
  };
}
