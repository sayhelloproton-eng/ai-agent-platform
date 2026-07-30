---
name: microsoft-dev-tunnels
description: Install, configure, run, verify, stop, and maintain the ai-agent-platform Microsoft Dev Tunnels MVP on macOS Intel. Use for persistent Dev Tunnel setup, loopback Gateway publication, public runtime.status verification, stable URL checks, Custom GPT Actions, or Dev Tunnel troubleshooting. Do not use for production ingress or alternative tunneling providers.
---

# Microsoft Dev Tunnels

Use the executable application under `apps/dev-tunnel/`; do not reproduce its process, Secret, or state logic inside this Skill.

## Boundaries

- Microsoft Dev Tunnels is Public Preview and has no production SLA.
- A persistent Tunnel and repeatable URL are not permanent domain ownership.
- A Tunnel Host must remain running for the public endpoint to work.
- Tunnel-level anonymous access does not remove Gateway Bearer authentication.
- Never expose Runtime port 8790; only publish loopback Gateway port 8787.
- Do not create a temporary Tunnel with `devtunnel host` without an ID.
- Stop on payment, subscription, domain purchase, or unclear resource ownership.

## Workflow

1. Read `references/official-cli-baseline.md` and run `npm run dev-tunnel:doctor`.
2. On macOS Intel, install the official app-local CLI with `npm run dev-tunnel:install`.
3. If not logged in, use GitHub device login and pause for the user. Never save the device code.
4. Run `npm run dev-tunnel:setup` to migrate existing keys without rotation and create or reuse the persistent Tunnel, 8787/http port, and anonymous access.
5. Run `npm run dev-tunnel:start` in a foreground terminal. It starts Runtime, Gateway, then the persistent Tunnel Host.
6. In another terminal, run `npm run dev-tunnel:status` and `npm run dev-tunnel:verify`.
7. Use `npm run dev-tunnel:stop`, restart with the same ID, then verify `public_url_stable: yes` and run public verification again.
8. Generate the local Action schema with `npm run dev-tunnel:openapi`; follow `references/custom-gpt-actions.md`.
9. For manual inactivity maintenance, run `npm run dev-tunnel:refresh` before 20 idle days. Do not install a scheduler without explicit authorization.

## Stop Conditions

- Unsupported platform or non-x64 CLI.
- Login requires user action and the user has not completed it.
- Any payment or subscription prompt.
- The desired Tunnel ID belongs to an unclear owner.
- Public URL cannot be extracted from the current Host process.
- Gateway authentication is disabled or either service binds beyond loopback.
- A public response is HTML rather than Gateway JSON.

## MVP Verification

Require all of:

- local and public `/health` return 200 JSON;
- unauthenticated public `/v1/capabilities` returns 401;
- authenticated public capabilities returns 200 and includes `runtime.status`;
- public zero-parameter `POST /v1/runtime/status` returns a succeeded Local Runtime status;
- the same taskId appears in Gateway and Runtime logs;
- stop/re-host with the same Tunnel ID preserves the exact URL;
- the real Custom GPT Action calls the same chain;
- no Secret, account identity, device code, or real Tunnel URL enters Git.

## Checkpoints

- Checkpoint 1 verified: official macOS x64 CLI `1.0.2010+aa42024ecd`, Intel `x86_64`.
- Checkpoint 2 verified: persistent Tunnel, inherited anonymous access, and one 8787/http port.
- Checkpoint 3 verified: public health, 401 boundary, authenticated capabilities, and real runtime.status.
- Checkpoint 4 verified: stop and re-host reused the exact URL; explicit refresh succeeded.
- Checkpoint 5 verified: the created Custom GPT used Bearer authentication and a natural-language request to call `getRuntimeStatus`; the formal conversation returned Local Runtime `0.1.0`, `ready`, with `gateway.ping` and `runtime.status`.
- MVP final checkpoint verified: the persistent Dev Tunnel URL remained exact across Host restart, and the formal Custom GPT Action completed through the same public Gateway → Local Runtime chain without recording the URL or credential in Git.

## References

- CLI and platform: `references/official-cli-baseline.md`
- Security and limits: `references/security-and-limits.md`
- End-to-end runbook: `references/mvp-runbook.md`
- Observed failures: `references/troubleshooting.md`
- Builder steps: `references/custom-gpt-actions.md`
