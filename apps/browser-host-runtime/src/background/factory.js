import { ChromeStorageArea } from "./storage.js";
import { readConfig, readSessionSecrets } from "./config.js";
import { FixtureGatewayClient, HttpGatewayClient } from "./gateway-client.js";
import { DispatchClient, ApprovalClient } from "./dispatch-client.js";
import { HostRegistry } from "./host-registry.js";
import { BindingRegistry } from "./binding-registry.js";
import { EvidenceStore } from "./evidence-store.js";
import { ObservationCoordinator } from "./observation-coordinator.js";
import { FixtureModelProvider, HttpDeepSeekProvider } from "./model-inference.js";
import { CommandJournal } from "./command-journal.js";
import { BrowserActionExecutor } from "./action-executor.js";
import { RuntimeCoordinator } from "./runtime-coordinator.js";

export async function createRuntime() {
  const localStorage = new ChromeStorageArea(chrome.storage.local);
  const sessionStorage = new ChromeStorageArea(chrome.storage.session);
  const config = await readConfig();
  const secrets = await readSessionSecrets();
  const gateway = config.transport_mode === "gateway"
    ? new HttpGatewayClient({ endpoint: config.gateway_endpoint, apiKey: secrets.gateway_api_key, timeoutMs: config.gateway_timeout_ms })
    : new FixtureGatewayClient(localStorage);
  const hostRegistry = new HostRegistry(localStorage, gateway);
  const host = await hostRegistry.getOrCreate();
  const bindingRegistry = new BindingRegistry(localStorage);
  const evidenceStore = new EvidenceStore(sessionStorage);
  const observationCoordinator = new ObservationCoordinator({ host_id: host.host_id, evidenceStore, screenshotQuality: config.screenshot_quality });
  const modelProvider = config.model_mode === "http"
    ? new HttpDeepSeekProvider({ endpoint: config.model_endpoint, apiKey: secrets.model_api_key, timeoutMs: config.model_timeout_ms })
    : new FixtureModelProvider();
  const journal = new CommandJournal(localStorage);
  const coordinator = new RuntimeCoordinator({
    host_id: host.host_id,
    dispatchClient: new DispatchClient(gateway),
    approvalClient: new ApprovalClient(gateway),
    bindingRegistry,
    journal,
    observationCoordinator,
    actionExecutor: new BrowserActionExecutor(),
    modelProvider,
    evidenceStore,
    configProvider: readConfig
  });
  return { config, gateway, host, hostRegistry, bindingRegistry, evidenceStore, observationCoordinator, modelProvider, journal, coordinator, localStorage, sessionStorage };
}
