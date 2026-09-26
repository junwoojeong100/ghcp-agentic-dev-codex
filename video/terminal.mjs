import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copilotEnvironment } from "../demo/copilot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ["/xterm.js", [join(here, "../node_modules/@xterm/xterm/lib/xterm.js"), "text/javascript"]],
  ["/xterm.css", [join(here, "../node_modules/@xterm/xterm/css/xterm.css"), "text/css"]],
]);

export function validInput(body) {
  return body && typeof body.data === "string" && body.data.length > 0 && body.data.length <= 32768
    && ["demo-automation", "interactive-terminal", "terminal-response"].includes(body.source);
}

export async function createTerminal({ run, workspace, args, onMark }) {
  const token = randomBytes(24).toString("hex");
  const events = new EventEmitter();
  const clients = new Set();
  const history = [];
  const marks = [];
  const cast = createWriteStream(join(run, "evidence/terminal.cast"), { flags: "wx" });
  const inputs = createWriteStream(join(run, "evidence/terminal-inputs.jsonl"), { flags: "wx" });
  cast.on("error", (error) => events.emit("failure", error));
  inputs.on("error", (error) => events.emit("failure", error));
  let child, startedAt, exitCode, finished = false;
  const elapsed = () => startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const publish = (message) => {
    if (message.type === "output") {
      history.push(message);
      cast.write(JSON.stringify([elapsed(), "o", message.data]) + "\n");
    }
    for (const response of clients) response.write(`data: ${JSON.stringify(message)}\n\n`);
  };
  function start() {
    if (child || finished) throw new Error("This recording can only start once.");
    startedAt = Date.now();
    cast.write(JSON.stringify({ version: 2, width: 112, height: 28, timestamp: Math.floor(startedAt / 1000), title: "Actual GitHub Copilot CLI terminal output", env: { TERM: "xterm-256color" } }) + "\n");
    child = spawn("python3", [join(here, "pty_bridge.py"), "--cwd", workspace, "--cols", "112", "--rows", "28", "--", "copilot", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: copilotEnvironment(run),
    });
    child.on("error", (error) => events.emit("failure", error));
    child.stderr.on("data", (data) => events.emit("failure", new Error(data.toString())));
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      try {
        const message = JSON.parse(line);
        publish(message);
        if (message.type === "error") events.emit("failure", new Error(message.message));
        if (message.type === "exit") { exitCode = message.exitCode; finished = true; events.emit("exit", exitCode); }
      } catch (error) { events.emit("failure", error); }
    });
    child.on("exit", (code) => {
      if (!finished) {
        finished = true;
        exitCode = code ?? 1;
        events.emit("failure", new Error(`PTY bridge stopped unexpectedly (${code}).`));
      }
    });
  }
  const html = (await fs.readFile(join(here, "terminal.html"), "utf8")).replace("__TOKEN__", JSON.stringify(token));
  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== `127.0.0.1:${server.address().port}`) {
        response.writeHead(403); response.end("Only the loopback recording origin is permitted."); return;
      }
      const url = new URL(request.url, `http://${request.headers.host}`);
      response.setHeader("Cache-Control", "no-store");
      if (request.method === "GET" && url.pathname === "/") {
        response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return;
      }
      if (request.method === "GET" && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        response.setHeader("Content-Type", type); response.end(await fs.readFile(file)); return;
      }
      if (request.method === "GET" && url.pathname === "/events" && url.searchParams.get("token") === token) {
        response.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive" });
        clients.add(response);
        for (const message of history) response.write(`data: ${JSON.stringify(message)}\n\n`);
        request.on("close", () => clients.delete(response));
        return;
      }
      if (request.method !== "POST" || request.headers["x-demo-token"] !== token) {
        response.writeHead(403); response.end("Terminal control requires the local recording token."); return;
      }
      const origin = request.headers.origin;
      if (origin && origin !== `http://${request.headers.host}`) {
        response.writeHead(403); response.end("Cross-origin terminal control is not allowed."); return;
      }
      let data = "";
      for await (const chunk of request) {
        data += chunk;
        if (data.length > 65536) throw new Error("Control request is too large.");
      }
      const body = JSON.parse(data || "{}");
      if (url.pathname === "/start") start();
      else if (url.pathname === "/input") {
        if (!validInput(body) || !child || finished) throw new Error("Invalid input or no running terminal.");
        if (body.source !== "terminal-response") inputs.write(JSON.stringify({ at: elapsed(), ...body, identityNote: "Input channel only; not authenticated human identity." }) + "\n");
        child.stdin.write(JSON.stringify({ type: "input", data: body.data }) + "\n");
      } else if (url.pathname === "/mark") {
        if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(body.name ?? "")) throw new Error("Invalid marker name.");
        if (marks.some((mark) => mark.name === body.name)) throw new Error("Marker already exists.");
        const mark = { name: body.name, at: elapsed(), recordedAt: new Date().toISOString() };
        if (onMark) await onMark(mark);
        marks.push(mark);
        await fs.writeFile(join(run, "evidence/terminal-marks.json"), JSON.stringify(marks, null, 2) + "\n");
      } else if (url.pathname === "/stop") {
        if (child && !finished) child.stdin.write(JSON.stringify({ type: "stop" }) + "\n");
      } else { response.writeHead(404); response.end("Unknown recording command."); return; }
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ok: true, elapsed: elapsed(), exitCode }));
    } catch (error) {
      response.writeHead(400, { "Content-Type": "text/plain" }); response.end(`STOP: ${error.message}`);
    }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  await fs.writeFile(join(run, "terminal-control.json"), JSON.stringify({ url, token }), { mode: 0o600 });
  return {
    url, events,
    get startedAt() { return startedAt; },
    get exitCode() { return exitCode; },
    async close() {
      if (child && !finished) child.stdin.write(JSON.stringify({ type: "stop" }) + "\n");
      for (const client of clients) client.end();
      await new Promise((resolve) => server.close(resolve));
      await Promise.all([new Promise((resolve) => cast.end(resolve)), new Promise((resolve) => inputs.end(resolve))]);
      await fs.unlink(join(run, "terminal-control.json"));
    },
  };
}
