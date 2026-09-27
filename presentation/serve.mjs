import { createServer } from "node:http";
import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowed = { "/": "delivery/slides.html", "/slides.html": "delivery/slides.html" };
const port = Number(process.argv[2] ?? 4275);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local preview port.");
const server = createServer(async (request,response)=>{
  const file = allowed[new URL(request.url,"http://127.0.0.1").pathname];
  if (!file || request.method !== "GET") { response.writeHead(404); response.end("Not found"); return; }
  try {
    const body = await fs.readFile(join(root,file));
    response.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
    response.end(body);
  } catch(error) {
    console.error(`Preview failed: ${error.message}`);
    response.writeHead(500,{"Content-Type":"text/plain; charset=utf-8"});
    response.end("Preview has not been built. See server log.");
  }
});
server.on("error",error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,"127.0.0.1",()=>console.log(`Presentation preview: http://127.0.0.1:${port}`));
for (const signal of ["SIGINT","SIGTERM"]) process.once(signal,()=>server.close());
