import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createRefundService } from "./refunds.mjs";

const assets = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.mjs": ["app.mjs", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
};

class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function readBody(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    throw new RequestError(415, "JSON_REQUIRED", "application/json 요청이 필요합니다.");
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= 16_384) chunks.push(chunk);
  }
  if (size > 16_384) throw new RequestError(413, "BODY_TOO_LARGE", "요청 본문이 너무 큽니다.");
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch (error) {
    if (error instanceof SyntaxError) throw new RequestError(400, "INVALID_JSON", "JSON 형식을 확인해 주세요.");
    throw error;
  }
}

export function createDemoServer() {
  const service = createRefundService();
  const server = createServer(async (request, response) => {
    try {
      const host = request.headers.host;
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host ?? "")) {
        throw new RequestError(403, "LOCAL_ONLY", "로컬 데모만 지원합니다.");
      }
      if (request.headers.origin && request.headers.origin !== `http://${host}`) {
        throw new RequestError(403, "ORIGIN_DENIED", "다른 출처의 요청을 허용하지 않습니다.");
      }
      const pathname = new URL(request.url, `http://${host}`).pathname;
      if (request.method === "GET" && Object.hasOwn(assets, pathname)) {
        const [file, type] = assets[pathname];
        const content = await readFile(new URL(`../public/${file}`, import.meta.url));
        response.writeHead(200, {
          "Content-Type": type, "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
        });
        response.end(content);
        return;
      }
      const body = request.method === "POST" ? await readBody(request) : undefined;
      const result = service.handle(request.method, request.url, body);
      if (result.body.policy) result.body.demoMode = process.env.DEMO_MODE ?? "local-app";
      response.writeHead(result.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(JSON.stringify(result.body));
    } catch (error) {
      if (!(error instanceof RequestError)) console.error("Demo request failed:", error);
      if (!response.headersSent) {
        response.writeHead(error instanceof RequestError ? error.status : 500, { "Content-Type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ error: {
        code: error instanceof RequestError ? error.code : "INTERNAL_ERROR",
        message: error instanceof RequestError ? error.message : "서버 오류가 발생했습니다.",
      } }));
    }
  });
  server.requestTimeout = 15_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }
  const server = createDemoServer();
  server.on("error", (error) => {
    console.error("Demo server failed:", error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Refund Control demo: http://127.0.0.1:${server.address().port}`);
  });
}
