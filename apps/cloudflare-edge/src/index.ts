const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

const HEALTH_BODY = {
  ok: true,
  service: "ai-agent-platform-edge",
  status: "placeholder",
} as const;

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

export function handleRequest(request: Request): Response {
  if (request.method !== "GET") {
    return jsonResponse(
      {
        ok: false,
        error: "METHOD_NOT_ALLOWED",
      },
      405,
      {
        allow: "GET",
      },
    );
  }

  const { pathname } = new URL(request.url);

  if (pathname === "/health") {
    return jsonResponse(HEALTH_BODY, 200);
  }

  return jsonResponse(
    {
      ok: false,
      error: "NOT_FOUND",
    },
    404,
  );
}

export default {
  fetch: handleRequest,
};
