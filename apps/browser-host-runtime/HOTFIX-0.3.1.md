# Browser Host Runtime 0.3.1 Hotfix

- Fixes Manifest V3 `fetch` illegal invocation in the HTTP Gateway client.
- Reconnects immediately after Gateway credentials are set.
- Preserves the private development Gateway credential across unpacked-extension reloads.
- Shows `NEEDS_CREDENTIAL` instead of a generic internal error when credentials are absent.

The local credential fallback is temporary for Phase 2 validation. Replace it with Native Messaging + macOS Keychain/environment-backed short-lived session credentials before distribution.
