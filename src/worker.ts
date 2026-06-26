/// <reference types="@cloudflare/workers-types" />

interface Env {
  PASTES: KVNamespace;
  ASSETS: Fetcher;
}

interface PasteRecord {
  content: string;
  language: string;
  createdAt: string;
  updatedAt?: string;
  passwordHash?: string;
  editTokenHash?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function generateId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function hashSecret(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Free: 1h/24h/7d — Pro: +30d — Team: +never
const EXPIRY_MAP: Record<string, number | null> = {
  "1h": 3600,
  "24h": 86400,
  "7d": 604800,
  "30d": 2592000,
  never: null,
};

const DEFAULT_TTL = 604800; // 7 days

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /api/paste — create a new paste
    if (request.method === "POST" && url.pathname === "/api/paste") {
      try {
        const body = (await request.json()) as {
          content?: string;
          language?: string;
          password?: string;
          expiresIn?: string;
        };
        const { content, language, password, expiresIn } = body;

        if (!content || typeof content !== "string") {
          return jsonResponse({ error: "content is required" }, 400);
        }

        const id = generateId(8);
        const editToken = generateId(24);

        const record: PasteRecord = {
          content,
          language: language || "plain",
          createdAt: new Date().toISOString(),
          editTokenHash: await hashSecret(editToken),
        };

        if (password && typeof password === "string" && password.length > 0) {
          record.passwordHash = await hashSecret(password);
        }

        const ttl =
          expiresIn && expiresIn in EXPIRY_MAP
            ? EXPIRY_MAP[expiresIn]
            : DEFAULT_TTL;

        const putOptions = ttl !== null ? { expirationTtl: ttl } : {};
        await env.PASTES.put(id, JSON.stringify(record), putOptions);

        return jsonResponse({ id, editToken });
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    // GET /api/paste/:id — retrieve a paste (omits content if password-protected)
    if (request.method === "GET" && url.pathname.startsWith("/api/paste/")) {
      const id = url.pathname.slice("/api/paste/".length);
      if (!id || id.includes("/")) {
        return jsonResponse({ error: "Not found" }, 404);
      }

      const raw = await env.PASTES.get(id);
      if (!raw) return jsonResponse({ error: "Not found" }, 404);

      const record = JSON.parse(raw) as PasteRecord;

      if (record.passwordHash) {
        return jsonResponse({
          passwordProtected: true,
          language: record.language,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }

      return jsonResponse({
        content: record.content,
        language: record.language,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    // POST /api/paste/:id/unlock — verify password and return content
    if (
      request.method === "POST" &&
      url.pathname.match(/^\/api\/paste\/[^/]+\/unlock$/)
    ) {
      const id = url.pathname.slice("/api/paste/".length).replace("/unlock", "");

      const raw = await env.PASTES.get(id);
      if (!raw) return jsonResponse({ error: "Not found" }, 404);

      try {
        const body = (await request.json()) as { password?: string };
        const { password } = body;

        if (!password || typeof password !== "string") {
          return jsonResponse({ error: "password is required" }, 400);
        }

        const record = JSON.parse(raw) as PasteRecord;

        if (!record.passwordHash) {
          return jsonResponse({
            content: record.content,
            language: record.language,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          });
        }

        const inputHash = await hashSecret(password);
        if (inputHash !== record.passwordHash) {
          return jsonResponse({ error: "Incorrect password" }, 403);
        }

        return jsonResponse({
          content: record.content,
          language: record.language,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    // PUT /api/paste/:id — update paste content (requires editToken)
    if (
      request.method === "PUT" &&
      url.pathname.match(/^\/api\/paste\/[^/]+$/)
    ) {
      const id = url.pathname.slice("/api/paste/".length);

      const raw = await env.PASTES.get(id, { type: "text" });
      if (!raw) return jsonResponse({ error: "Not found" }, 404);

      try {
        const body = (await request.json()) as {
          editToken?: string;
          content?: string;
          language?: string;
        };
        const { editToken, content, language } = body;

        if (!editToken || typeof editToken !== "string") {
          return jsonResponse({ error: "editToken is required" }, 400);
        }
        if (!content || typeof content !== "string") {
          return jsonResponse({ error: "content is required" }, 400);
        }

        const record = JSON.parse(raw) as PasteRecord;

        if (!record.editTokenHash) {
          return jsonResponse({ error: "This paste cannot be edited" }, 403);
        }

        const inputHash = await hashSecret(editToken);
        if (inputHash !== record.editTokenHash) {
          return jsonResponse({ error: "Invalid edit token" }, 403);
        }

        const renewOnly = (body as { renewOnly?: boolean }).renewOnly === true;

        const updated: PasteRecord = {
          ...record,
          content: renewOnly ? record.content : content,
          language: renewOnly ? record.language : (language || record.language),
          updatedAt: new Date().toISOString(),
        };

        await env.PASTES.put(id, JSON.stringify(updated), { expirationTtl: DEFAULT_TTL });

        return jsonResponse({ id, updatedAt: updated.updatedAt });
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    // All other requests — serve static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
