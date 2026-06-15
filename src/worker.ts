/// <reference types="@cloudflare/workers-types" />

interface Env {
  PASTES: KVNamespace;
  ASSETS: Fetcher;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function generateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const byte of bytes) {
    id += chars[byte % chars.length];
  }
  return id;
}

const TTL_SECONDS = 604800; // 7 days

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /api/paste — create a new paste
    if (request.method === "POST" && url.pathname === "/api/paste") {
      try {
        const body = (await request.json()) as { content?: string; language?: string };
        const { content, language } = body;

        if (!content || typeof content !== "string") {
          return jsonResponse({ error: "content is required" }, 400);
        }

        const id = generateId();
        const data = JSON.stringify({
          content,
          language: language || "plain",
          createdAt: new Date().toISOString(),
        });

        await env.PASTES.put(id, data, { expirationTtl: TTL_SECONDS });

        return jsonResponse({ id });
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    // GET /api/paste/:id — retrieve a paste
    if (request.method === "GET" && url.pathname.startsWith("/api/paste/")) {
      const id = url.pathname.slice("/api/paste/".length);
      if (!id) {
        return jsonResponse({ error: "Not found" }, 404);
      }

      const data = await env.PASTES.get(id);
      if (!data) {
        return jsonResponse({ error: "Not found" }, 404);
      }

      return jsonResponse(JSON.parse(data));
    }

    // All other requests — serve static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
