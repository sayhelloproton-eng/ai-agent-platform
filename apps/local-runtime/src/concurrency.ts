export interface ConcurrencyGate {
  tryAcquire(): (() => void) | undefined;
  readonly activeCount: number;
  readonly limit: number;
}

export function createConcurrencyGate(limit: number): ConcurrencyGate {
  if (!Number.isInteger(limit) || limit < 1 || limit > 16) {
    throw new Error("Runtime concurrency limit must be an integer from 1 to 16.");
  }

  let activeCount = 0;

  return {
    get activeCount(): number {
      return activeCount;
    },

    limit,

    tryAcquire(): (() => void) | undefined {
      if (activeCount >= limit) {
        return undefined;
      }

      activeCount += 1;
      let released = false;

      return () => {
        if (!released) {
          released = true;
          activeCount = Math.max(0, activeCount - 1);
        }
      };
    },
  };
}
