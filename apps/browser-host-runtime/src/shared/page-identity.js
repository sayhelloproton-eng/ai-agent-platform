import { sha256Ref } from "./crypto.js";

export function parseChatGptIdentity(urlValue) {
  const url = new URL(urlValue);
  if (url.hostname !== "chatgpt.com") return { provider: "unknown", gpt_ref: null, conversation_ref: null, url: url.href };
  const path = url.pathname;
  const gptMatch = path.match(/\/g\/(g-[^/]+)/);
  const conversationMatch = path.match(/\/c\/([^/?#]+)/) || path.match(/\/g\/g-[^/]+\/[^/]+\/c\/([^/?#]+)/);
  return {
    provider: "chatgpt-web",
    gpt_ref: gptMatch?.[1] ?? "chatgpt-default",
    conversation_ref: conversationMatch?.[1] ?? null,
    url: url.href
  };
}

export function pageIdentityProjection(identity) {
  return {
    provider: identity.provider,
    gpt_ref: identity.gpt_ref ?? null,
    conversation_ref: identity.conversation_ref ?? null,
    canonical_path: (() => {
      try { return new URL(identity.url).pathname; } catch { return String(identity.url ?? ""); }
    })()
  };
}

export async function computePageIdentityFingerprint(identity) {
  return sha256Ref(pageIdentityProjection(identity));
}

export function targetMatchesIdentity(target, identity) {
  if (!identity || identity.provider !== "chatgpt-web") return false;
  if (target.gpt_ref && target.gpt_ref !== identity.gpt_ref) return false;
  if (target.conversation_ref && target.conversation_ref !== identity.conversation_ref) return false;
  return true;
}
