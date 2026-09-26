import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, paths } from "./workflow.mjs";
import { replayCopilot } from "./copilot.mjs";

const [mode, requestedPort] = process.argv.slice(2);
if (!["before", "after"].includes(mode)) throw new Error("Usage: node demo/serve.mjs before|after [port]");
const port = Number(requestedPort ?? (mode === "before" ? 4173 : 4174));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be an integer from 1 to 65535.");
let workspace = join(ROOT, "demo/starter");
if (mode === "after") {
  const name = `preview-${Date.now().toString(36)}`;
  await replayCopilot(name);
  workspace = paths(name).workspace;
  process.env.DEMO_MODE = "recorded-replay";
} else process.env.DEMO_MODE = "baseline";

const { createDemoServer } = await import(pathToFileURL(join(workspace, "src/server.mjs")));
const server = createDemoServer();
server.on("error", (error) => { console.error(`STOP: ${error.message}`); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`\n${mode.toUpperCase()} demo: http://127.0.0.1:${port}\nSynthetic local data. No actual payment. Press Ctrl+C to stop.`));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
