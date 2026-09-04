import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import fs from "fs";
import path from "path";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function tryReadIndexHtml(): string | null {
  // Try common locations where the built index.html might live
  const candidates = [
    path.resolve(process.cwd(), ".output", "public", "index.html"), // Nitro public
    path.resolve(process.cwd(), "dist", "index.html"), // Vite output
    path.resolve(process.cwd(), "public", "index.html"), // public folder
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf8");
      }
    } catch (err) {
      console.error("Error checking for index.html at", p, err);
    }
  }
  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      // Normalize SSR errors (existing)
      const normalized = await normalizeCatastrophicSsrResponse(response);

      // If handler returned 404 and client wants HTML, serve built index.html as a SPA fallback
      if (normalized.status === 404 && request.method === "GET") {
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/html")) {
          const html = tryReadIndexHtml();
          if (html) {
            return new Response(html, {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          } else {
            console.error("SPA fallback: no built index.html found in .output/public, dist/, or public/");
          }
        }
      }

      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
