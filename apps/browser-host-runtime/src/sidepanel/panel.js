const $ = (id) => document.getElementById(id);
function request(message) { return chrome.runtime.sendMessage(message); }
function output(value) { $("output").textContent = JSON.stringify(value, null, 2); }

async function refresh() {
  const response = await request({ type: "BHR_GET_STATUS" });
  if (!response.ok) return output(response);
  const { host, config, credential_state, bindings, pending_reviews } = response.data;
  $("host-state").textContent = config.emergency_stopped
    ? "STOPPED"
    : config.paused
      ? "PAUSED"
      : !credential_state?.gateway_api_key_set
        ? "NEEDS_CREDENTIAL"
        : host.state;
  const root = $("bindings");
  root.textContent = "";
  for (const binding of bindings) {
    const item = document.createElement("div");
    item.className = "binding";
    item.innerHTML = `<strong>${binding.role_ref}</strong><br>${binding.state} · ${binding.gpt_ref}<br>${binding.conversation_ref ?? "new conversation"}<div class="actions"><button data-action="follow">跟随</button><button data-action="observe">观察</button><button data-action="unbind">解绑</button></div>`;
    item.querySelector('[data-action="follow"]').onclick = async () => output(await request({ type: "BHR_SET_FOLLOW_LATEST", binding_id: binding.binding_id, enabled: true }));
    item.querySelector('[data-action="observe"]').onclick = async () => output(await request({ type: "BHR_OBSERVE_BINDING", binding_id: binding.binding_id }));
    item.querySelector('[data-action="unbind"]').onclick = async () => { output(await request({ type: "BHR_UNBIND", binding_id: binding.binding_id })); await refresh(); };
    root.appendChild(item);
  }
  if (pending_reviews?.length) output({ pending_reviews: pending_reviews.slice(0, 3) });
}

$("bind").onclick = async () => { output(await request({ type: "BHR_BIND_ACTIVE_TAB", role_ref: $("role-ref").value.trim() || "controller" })); await refresh(); };
$("observe").onclick = async () => {
  const status = await request({ type: "BHR_GET_STATUS" });
  const binding = status.data?.bindings?.find((item) => item.state === "READY");
  output(binding ? await request({ type: "BHR_OBSERVE_BINDING", binding_id: binding.binding_id }) : { ok: false, error: { code: "BINDING_NOT_READY" } });
};
$("prepare-fixture").onclick = async () => output(await request({ type: "BHR_PREPARE_FIXTURE_WAKE" }));
$("approve-fixture").onclick = async () => output(await request({ type: "BHR_APPROVE_FIXTURE_WAKE" }));
$("process").onclick = async () => { output(await request({ type: "BHR_PROCESS_ONE" })); await refresh(); };
$("pause").onclick = async () => { output(await request({ type: "BHR_PAUSE" })); await refresh(); };
$("resume").onclick = async () => { output(await request({ type: "BHR_RESUME" })); await refresh(); };
$("stop").onclick = async () => { output(await request({ type: "BHR_EMERGENCY_STOP" })); await refresh(); };
$("options").onclick = () => chrome.runtime.openOptionsPage();
refresh().catch(output);
