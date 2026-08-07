const $ = (id) => document.getElementById(id);
function request(message) { return chrome.runtime.sendMessage(message); }
function output(value) { $("output").textContent = JSON.stringify(value, null, 2); }

function addTextLine(parent, text, { strong = false } = {}) {
  const line = document.createElement(strong ? "strong" : "span");
  line.textContent = text;
  parent.appendChild(line);
  parent.appendChild(document.createElement("br"));
}

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
    addTextLine(item, binding.role_ref, { strong: true });
    addTextLine(item, `${binding.state} · ${binding.gpt_ref}`);
    addTextLine(item, binding.conversation_ref ?? "new conversation");
    if (binding.stale_reason) addTextLine(item, `stale: ${binding.stale_reason}`);

    const actions = document.createElement("div");
    actions.className = "actions";
    const follow = document.createElement("button");
    follow.dataset.action = "follow";
    follow.textContent = "跟随";
    follow.disabled = binding.state !== "READY";
    follow.onclick = async () => output(await request({ type: "BHR_SET_FOLLOW_LATEST", binding_id: binding.binding_id, enabled: true }));

    const observe = document.createElement("button");
    observe.dataset.action = "observe";
    observe.textContent = "观察";
    observe.disabled = binding.state !== "READY";
    observe.onclick = async () => output(await request({ type: "BHR_OBSERVE_BINDING", binding_id: binding.binding_id }));

    const unbind = document.createElement("button");
    unbind.dataset.action = "unbind";
    unbind.textContent = "解绑";
    unbind.onclick = async () => { output(await request({ type: "BHR_UNBIND", binding_id: binding.binding_id })); await refresh(); };

    actions.append(follow, observe, unbind);
    item.appendChild(actions);
    root.appendChild(item);
  }
  if (pending_reviews?.length) output({ pending_reviews: pending_reviews.slice(0, 3) });
}

$("bind").onclick = async () => { output(await request({ type: "BHR_BIND_ACTIVE_TAB", role_ref: $("role-ref").value.trim() || "controller" })); await refresh(); };
$("observe").onclick = async () => {
  const status = await request({ type: "BHR_GET_STATUS" });
  if (!status.ok) return output(status);
  const ready = status.data?.bindings?.filter((item) => item.state === "READY") ?? [];
  if (ready.length === 0) return output({ ok: false, error: { code: "BINDING_NOT_READY", message: "No READY Binding is available." } });
  if (ready.length !== 1) {
    return output({
      ok: false,
      error: {
        code: "BINDING_SELECTION_REQUIRED",
        message: "Multiple READY Bindings exist. Use the Observe button on the intended Binding."
      }
    });
  }
  output(await request({ type: "BHR_OBSERVE_BINDING", binding_id: ready[0].binding_id }));
};
$("prepare-fixture").onclick = async () => output(await request({ type: "BHR_PREPARE_FIXTURE_WAKE" }));
$("approve-fixture").onclick = async () => output(await request({ type: "BHR_APPROVE_FIXTURE_WAKE" }));
$("process").onclick = async () => { output(await request({ type: "BHR_PROCESS_ONE" })); await refresh(); };
$("pause").onclick = async () => { output(await request({ type: "BHR_PAUSE" })); await refresh(); };
$("resume").onclick = async () => { output(await request({ type: "BHR_RESUME" })); await refresh(); };
$("stop").onclick = async () => { output(await request({ type: "BHR_EMERGENCY_STOP" })); await refresh(); };
$("options").onclick = () => chrome.runtime.openOptionsPage();
refresh().catch(output);
