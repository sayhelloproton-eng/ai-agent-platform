export class ExecutionGate {
  constructor() {
    this.queue = Promise.resolve();
  }

  run(_label, work) {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
