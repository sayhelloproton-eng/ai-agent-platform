import { createRuntime } from "./factory.js";
import { readConfig, readSessionSecrets, writeConfig, writeSessionSecrets } from "./config.js";
import { asSafeError } from "../shared/errors.js";
import { buildWakeEnvelope } from "../shared/contracts.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../shared/fingerprints.js";
import { randomId } from "../shared/crypto.js";
import { computePageIdentityFingerprint, parseChatGptIdentity } from "../shared/page-identity.js";
import { ExecutionGate } from "./execution-gate.js";

const ALARMS = { HEARTBEAT: "bhr-heartbeat", POLL: "bhr-dispatch-poll", OBSERVE: "bhr-observation" };
const PENDING_REVIEW_KEY = "bhr.pending_reviews";
const FIXTURE_DRAFT_KEY = "bhr.fixture.pending_wake";
const executionGate = new ExecutionGate();

async function ensureAlarms() {
  const config = await readConfig();
  await chrome.alarms.create(ALARMS.HEARTBEAT, { periodInMinutes: Math.max(0.5, config.heartbeat_seconds / 60) });
  await chrome.alarms.create(ALARMS.POLL, { periodInMinutes: Math.max(0.5, config.dispatch_poll_seconds / 60) });
  await chrome.alarms.create(ALARMS.OBSERVE, { periodInMinutes: Math.max(0.5, config.observation_seconds / 60) });
}

async function registerAndRecover() {
  return executionGate.run("register-and-recover", async () => {
    const runtime = await createRuntime();
    await runtime.journal?.recoverAfterRestart?.();
    try { await runtime.hostRegistry.register(); } catch (error) { console.warn("BHR host registration deferred", asSafeError(error)); }
    try { await runtime.coordinator.processOne(); } catch (error) { console.warn("BHR recovery report/observation deferred", asSafeError(error)); }
    await ensureAlarms();
  });
}

async function heartbeat() {
  const runtime = await createRuntime();
  const bindings = await runtime.bindingRegistry.list();
  await runtime.hostRegistry.heartbeat({
    active_binding_count: bindings.filter((item) => item.state === "READY").length,
    paused: runtime.config.paused,
    emergency_stopped: runtime.config.emergency_stopped,
    state: runtime.config.emergency_stopped ? "STOPPED" : runtime.config.paused ? "PAUSED" : "ONLINE"
  });
}

async function pollOnce() {
  return executionGate.run("dispatch-poll", async () => (await createRuntime()).coordinator.processOne());
}
async function observeReadyBindings({ tabId = null } = {}) {
  const runtime = await createRuntime();
  if (runtime.config.paused || runtime.config.emergency_stopped) return [];
  const bindings = (await runtime.bindingRegistry.list()).filter((item) => item.state === "READY" && (tabId === null || item.chrome_tab_id === tabId));
  const results = [];
  for (const binding of bindings) {
    try {
      const observed = await runtime.observationCoordinator.observe(binding, { includeScreenshot: true });
      await runtime.bindingRegistry.validateObservation(binding, observed.observation);
      const evidence = { page: observed.local };
      if (observed.observation.screenshot_ref) evidence.screenshot = await runtime.evidenceStore.get(observed.observation.screenshot_ref);
      const assessment = await runtime.modelProvider.analyze({ observation: observed.observation, evidence });
      const result = { binding_id: binding.binding_id, observation: observed.observation, assessment, recorded_at: new Date().toISOString() };
      results.push(result);
      if (["ESCALATE_TO_CONTROLLER", "REQUEST_HUMAN_REVIEW"].includes(assessment.decision)) {
        const reviews = (await runtime.localStorage.get(PENDING_REVIEW_KEY)) ?? [];
        reviews.unshift(result);
        await runtime.localStorage.set(PENDING_REVIEW_KEY, reviews.slice(0, 20));
      }
    } catch (error) {
      results.push({ binding_id: binding.binding_id, error: asSafeError(error), recorded_at: new Date().toISOString() });
    }
  }
  return results;
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve(response);
  }));
}

async function bindActiveTab(role_ref = "controller") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://chatgpt.com/")) throw Object.assign(new Error("Active tab must be a ChatGPT page."), { code: "ACTIVE_TAB_NOT_CHATGPT" });
  const page = await sendTabMessage(tab.id, { type: "BHR_PING" });
  if (!page?.ok) throw Object.assign(new Error("ChatGPT content adapter is unavailable."), { code: "CONTENT_SCRIPT_UNAVAILABLE" });
  const runtime = await createRuntime();
  const page_fingerprint = await computePageIdentityFingerprint(page.data);
  const binding = await runtime.bindingRegistry.bind({
    host_id: runtime.host.host_id,
    chrome_tab_id: tab.id,
    window_id: tab.windowId,
    role_ref,
    gpt_ref: page.data.gpt_ref,
    conversation_ref: page.data.conversation_ref,
    page_fingerprint,
    url: tab.url
  });
  await sendTabMessage(tab.id, { type: "BHR_SET_FOLLOW_LATEST", enabled: true });
  return binding;
}

async function buildStatus() {
  const runtime = await createRuntime();
  const secrets = await readSessionSecrets();
  const bindings = await runtime.bindingRegistry.list();
  const journal = await runtime.journal?.entries?.() ?? {};
  return {
    host: runtime.host,
    credential_state: {
      gateway_api_key_set: Boolean(secrets.gateway_api_key),
      model_api_key_set: Boolean(secrets.model_api_key)
    },
    config: { ...runtime.config, gateway_endpoint: runtime.config.gateway_endpoint, model_endpoint: runtime.config.model_endpoint },
    bindings,
    pending_reviews: (await runtime.localStorage.get(PENDING_REVIEW_KEY)) ?? [],
    latest_commands: Object.values(journal).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 10)
  };
}

async function prepareFixtureWake() {
  const runtime = await createRuntime();
  if (!(runtime.gateway?.enqueue instanceof Function)) throw Object.assign(new Error("Fixture queue is only available in fixture transport mode."), { code: "FIXTURE_MODE_REQUIRED" });
  const binding = (await runtime.bindingRegistry.list()).find((item) => item.state === "READY");
  if (!binding) throw Object.assign(new Error("Bind a ready ChatGPT tab before preparing the fixture command."), { code: "BINDING_NOT_READY" });
  const dispatch_ref = randomId("browser-dispatch");
  const command_id = randomId("host-command");
  const payload_ref = randomId("wake-envelope");
  const approval_ref = randomId("approval");
  const wake = buildWakeEnvelope({ task_id: "fixture-task-001", required_role: binding.role_ref, event_id: randomId("event"), dispatch_ref, conversation_ref: binding.conversation_ref });
  const command = {
    host_command_version: "0.1.0", command_id, dispatch_ref, task_id: wake.task_id,
    target: { role_ref: binding.role_ref, gpt_ref: binding.gpt_ref, conversation_ref: binding.conversation_ref },
    action: { type: "SUBMIT_MESSAGE", payload_ref }, preconditions: {}, approval_ref, idempotency_key: command_id,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };
  const pre = await runtime.observationCoordinator.observe(binding, { includeScreenshot: false });
  const pageHash = await computePagePreconditionHash(pre.observation);
  const payload = { text: JSON.stringify(wake, null, 2) };
  const actionFingerprint = await computeActionFingerprint({ command, binding_id: binding.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
  const draft = { dispatch_ref, command, payload, wake, binding_id: binding.binding_id, page_precondition_hash: pageHash, action_fingerprint: actionFingerprint, prepared_at: new Date().toISOString() };
  await runtime.sessionStorage.set(FIXTURE_DRAFT_KEY, draft);
  return draft;
}

async function approveFixtureWake() {
  const runtime = await createRuntime();
  if (!(runtime.gateway?.enqueue instanceof Function)) throw Object.assign(new Error("Fixture queue is only available in fixture transport mode."), { code: "FIXTURE_MODE_REQUIRED" });
  const draft = await runtime.sessionStorage.get(FIXTURE_DRAFT_KEY);
  if (!draft) throw Object.assign(new Error("Prepare and review a Fixture Wake before approval."), { code: "FIXTURE_DRAFT_NOT_FOUND" });
  const grant = {
    approval_ref: draft.command.approval_ref, grant_id: randomId("approval-grant"), action_fingerprint: draft.action_fingerprint,
    binding_id: draft.binding_id, task_id: draft.command.task_id, command_id: draft.command.command_id,
    allowed_action_type: draft.command.action.type, page_precondition_hash: draft.page_precondition_hash, single_use: true,
    expires_at: draft.command.expires_at, consumed_at: null
  };
  await runtime.gateway.enqueue({ dispatch_ref: draft.dispatch_ref, command: draft.command, payload: draft.payload, grant });
  await runtime.sessionStorage.remove(FIXTURE_DRAFT_KEY);
  return { approved: true, dispatch_ref: draft.dispatch_ref, command_id: draft.command.command_id, approval_ref: grant.approval_ref };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.warn);
  registerAndRecover().catch((error) => console.error("BHR install recovery failed", asSafeError(error)));
});
chrome.runtime.onStartup.addListener(() => registerAndRecover().catch((error) => console.error("BHR startup recovery failed", asSafeError(error))));
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARMS.HEARTBEAT) heartbeat().catch((error) => console.warn("BHR heartbeat failed", asSafeError(error)));
  if (alarm.name === ALARMS.POLL) pollOnce().catch((error) => console.warn("BHR dispatch poll failed", asSafeError(error)));
  if (alarm.name === ALARMS.OBSERVE) observeReadyBindings().catch((error) => console.warn("BHR observation loop failed", asSafeError(error)));
});
chrome.commands.onCommand.addListener((command) => {
  if (command === "emergency-stop") writeConfig({ emergency_stopped: true, paused: true }).catch(console.error);
});
chrome.tabs.onRemoved.addListener((tabId) => createRuntime().then((runtime) => runtime.bindingRegistry.markTabStale(tabId, "TAB_CLOSED")).catch(console.warn));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  createRuntime().then(async (runtime) => {
    const binding = await runtime.bindingRegistry.findByTabId(tabId);
    if (!binding) return;
    let identity = null;
    try { identity = parseChatGptIdentity(tab.url ?? changeInfo.url); } catch { /* invalid navigation is stale */ }
    await runtime.bindingRegistry.reconcileNavigation(tabId, identity);
  }).catch(console.warn);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "BHR_GET_STATUS": return { ok: true, data: await buildStatus() };
      case "BHR_BIND_ACTIVE_TAB": return { ok: true, data: await bindActiveTab(message.role_ref ?? "controller") };
      case "BHR_OBSERVE_BINDING": {
        const runtime = await createRuntime();
        const binding = (await runtime.bindingRegistry.list()).find((item) => item.binding_id === message.binding_id);
        if (!binding) throw Object.assign(new Error("Binding not found."), { code: "BINDING_NOT_FOUND" });
        const observed = await runtime.observationCoordinator.observe(binding, { includeScreenshot: true });
        await runtime.bindingRegistry.validateObservation(binding, observed.observation);
        const assessment = await runtime.modelProvider.analyze({ observation: observed.observation, evidence: { page: observed.local } });
        return { ok: true, data: { observation: observed.observation, assessment } };
      }
      case "BHR_SET_FOLLOW_LATEST": {
        const runtime = await createRuntime();
        const binding = (await runtime.bindingRegistry.list()).find((item) => item.binding_id === message.binding_id);
        if (!binding) throw Object.assign(new Error("Binding not found."), { code: "BINDING_NOT_FOUND" });
        const result = await sendTabMessage(binding.chrome_tab_id, { type: "BHR_SET_FOLLOW_LATEST", enabled: Boolean(message.enabled) });
        await runtime.bindingRegistry.update(binding.binding_id, { mode: message.enabled ? "FOLLOW_LATEST" : "MANUAL" });
        return result;
      }
      case "BHR_UNBIND": {
        const runtime = await createRuntime();
        await runtime.bindingRegistry.remove(message.binding_id);
        return { ok: true, data: { removed: true } };
      }
      case "BHR_PAUSE": return { ok: true, data: await writeConfig({ paused: true }) };
      case "BHR_RESUME": return { ok: true, data: await writeConfig({ paused: false, emergency_stopped: false }) };
      case "BHR_EMERGENCY_STOP": return { ok: true, data: await writeConfig({ paused: true, emergency_stopped: true }) };
      case "BHR_PROCESS_ONE": return { ok: true, data: await pollOnce() };
      case "BHR_PREPARE_FIXTURE_WAKE": return { ok: true, data: await prepareFixtureWake() };
      case "BHR_APPROVE_FIXTURE_WAKE": return { ok: true, data: await approveFixtureWake() };
      case "BHR_PAGE_SIGNAL": return { ok: true, data: await observeReadyBindings({ tabId: _sender.tab?.id ?? null }) };
      case "BHR_SAVE_CONFIG": return { ok: true, data: await writeConfig(message.patch ?? {}) };
      case "BHR_SET_SESSION_SECRETS": {
        const saved = await writeSessionSecrets(message.secrets ?? {});
        await registerAndRecover();
        return { ok: true, data: { ...saved, status: await buildStatus() } };
      }
      default: throw Object.assign(new Error(`Unsupported runtime message: ${message.type}`), { code: "MESSAGE_TYPE_UNSUPPORTED" });
    }
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, error: asSafeError(error) }));
  return true;
});

registerAndRecover().catch((error) => console.warn("BHR initial recovery deferred", asSafeError(error)));
