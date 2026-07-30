import {
  readState,
  removeState,
  stopRecordedState,
} from "./lib.mjs";

try {
  const state = readState();
  const results = await stopRecordedState(state);
  removeState();
  console.log("stop: PASS");
  for (const [name, result] of results) {
    console.log(`${name}: ${result}`);
  }
} catch (error) {
  console.error(`stop: FAIL (${error.code ?? "UNKNOWN"})`);
  process.exitCode = 1;
}
