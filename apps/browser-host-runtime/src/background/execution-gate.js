export class ExecutionGate {
  constructor() {
    this.queue = Promise.resolve();
    this.pending = 0;
  }

  run(_label, work) {
    this.pending += 1;
    const wrapped = async () => {
      try { return await work(); }
      finally { this.pending = Math.max(0, this.pending - 1); }
    };
    const next = this.queue.then(wrapped, wrapped);
    this.queue = next.catch(() => undefined);
    return next;
  }

  // Passive observations are advisory and must never build an unbounded queue
  // in front of dispatch work. If any execution is active or already queued,
  // coalesce the passive trigger instead of enqueueing it.
  tryRun(_label, work, fallback = { skipped: true, reason: "EXECUTION_BUSY" }) {
    if (this.pending > 0) return Promise.resolve(fallback);
    return this.run(_label, work);
  }

  status() {
    return { busy: this.pending > 0, pending: this.pending };
  }
}
