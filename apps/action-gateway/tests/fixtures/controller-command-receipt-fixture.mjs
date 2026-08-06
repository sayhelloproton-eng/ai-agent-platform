function clone(value) {
  return structuredClone(value);
}

function receiptKey(input) {
  return `${input.producerRef}:${input.taskId}:${input.idempotencyKey}`;
}

/**
 * Contract-test fixture for the future Task Control persistent CommandReceipt port.
 * The fixture deliberately keeps receipts outside CTL so crash recovery tests do
 * not treat the Controller response cache as the command authority.
 */
export function createControllerCommandReceiptFixture(service) {
  const receipts = new Map();

  return {
    getDecisionContext: service.getDecisionContext.bind(service),
    getTask: service.getTask.bind(service),
    listEvents: service.listEvents.bind(service),
    claimController: service.claimController.bind(service),
    submitControllerCommand: service.submitControllerCommand.bind(service),
    releaseControllerClaim: service.releaseControllerClaim.bind(service),

    async submitControllerCommandWithReceipt(input, lookup) {
      const key = receiptKey(lookup);
      const existing = receipts.get(key);
      if (existing !== undefined) return clone(existing);

      const commandResult = await service.submitControllerCommand(input);
      const [taskSnapshot, events] = await Promise.all([
        service.getTask(input.taskId),
        service.listEvents(input.taskId),
      ]);
      const eventIds = new Set(commandResult.eventIds);
      const event = [...events].reverse().find((item) => eventIds.has(item.eventId));
      if (event === undefined) {
        throw new Error("Receipt fixture could not find the committed Task Event.");
      }
      const receipt = {
        requestFingerprint: lookup.requestFingerprint,
        commandResult: clone(commandResult),
        taskSnapshot: clone(taskSnapshot),
        event: clone(event),
        eventSequence: events.findIndex((item) => item.eventId === event.eventId) + 1,
        eventCount: events.length,
      };
      receipts.set(key, clone(receipt));
      return clone(receipt);
    },

    async readControllerCommandReceipt(lookup) {
      const value = receipts.get(receiptKey(lookup));
      return value === undefined ? null : clone(value);
    },
  };
}
