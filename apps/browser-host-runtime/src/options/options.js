const $ = (id) => document.getElementById(id);
const status = (value) => $("status").textContent = JSON.stringify(value, null, 2);
const request = (message) => chrome.runtime.sendMessage(message);

async function load() {
  const response = await request({ type: "BHR_GET_STATUS" });
  if (!response.ok) return status(response);
  const config = response.data.config;
  for (const key of ["transport_mode", "gateway_endpoint", "model_mode", "model_endpoint", "dispatch_poll_seconds", "observation_seconds"]) $(key).value = config[key];
}

$("config").onsubmit = async (event) => {
  event.preventDefault();
  status(await request({ type: "BHR_SAVE_CONFIG", patch: {
    transport_mode: $("transport_mode").value,
    gateway_endpoint: $("gateway_endpoint").value,
    model_mode: $("model_mode").value,
    model_endpoint: $("model_endpoint").value,
    dispatch_poll_seconds: Number($("dispatch_poll_seconds").value),
    observation_seconds: Number($("observation_seconds").value)
  } }));
};
$("secrets").onsubmit = async (event) => {
  event.preventDefault();
  status(await request({ type: "BHR_SET_SESSION_SECRETS", secrets: {
    gateway_api_key: $("gateway_api_key").value,
    model_api_key: $("model_api_key").value
  } }));
  $("gateway_api_key").value = "";
  $("model_api_key").value = "";
};
load().catch(status);
