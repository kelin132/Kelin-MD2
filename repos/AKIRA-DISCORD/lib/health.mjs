import { createServer } from "node:http";
import { log } from "./logger.mjs";

export function startHealthServer({ port = process.env.PORT || 8080 } = {}) {
  const server = createServer((request, response) => {
    if (request.url === "/healthz" || request.url === "/readyz") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, service: "akira-discord" }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(Number(port), "0.0.0.0", () => {
    log("info", `Health endpoint listening on port ${port}`);
  });

  return server;
}
