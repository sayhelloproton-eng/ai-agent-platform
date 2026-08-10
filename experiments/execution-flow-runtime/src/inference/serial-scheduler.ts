/**
 * Minimal FIFO promise-chain scheduler for one exclusive inference resource.
 *
 * A failed job must never poison the tail. This scheduler knows nothing about
 * ExecutionRun/Task semantics; it only serializes access to one provider lane.
 */
export class SerialPromiseScheduler {
  #tail: Promise<void> = Promise.resolve();

  enqueue<T>(job: () => Promise<T>): Promise<T> {
    const current = this.#tail.then(job);
    this.#tail = current.then(
      () => undefined,
      () => undefined
    );
    return current;
  }
}
