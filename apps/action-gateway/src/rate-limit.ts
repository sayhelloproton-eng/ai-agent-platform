export interface FixedWindowRateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string): RateLimitDecision;
}

interface WindowState {
  startedAt: number;
  count: number;
}

function validateInteger(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }

  return value;
}

export function createFixedWindowRateLimiter(
  options: FixedWindowRateLimiterOptions,
): RateLimiter {
  const limit = validateInteger(options.limit, 1, 10_000, "Rate limit");
  const windowMs = validateInteger(
    options.windowMs,
    1_000,
    3_600_000,
    "Rate limit window",
  );
  const now = options.now ?? Date.now;
  const windows = new Map<string, WindowState>();

  return {
    consume(key): RateLimitDecision {
      const currentTime = now();
      if (!Number.isFinite(currentTime)) {
        throw new Error("Rate limiter clock must return a finite timestamp.");
      }

      let state = windows.get(key);
      if (
        state === undefined ||
        currentTime < state.startedAt ||
        currentTime - state.startedAt >= windowMs
      ) {
        state = { startedAt: currentTime, count: 0 };
        windows.set(key, state);
      }

      const allowed = state.count < limit;
      if (allowed) {
        state.count += 1;
      }

      const resetAt = state.startedAt + windowMs;
      return Object.freeze({
        allowed,
        limit,
        remaining: Math.max(0, limit - state.count),
        resetAt,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((resetAt - currentTime) / 1_000),
        ),
      });
    },
  };
}
