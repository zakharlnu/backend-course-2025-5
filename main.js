import { program } from "commander";
import http from 'node:http';
import fs from "node:fs/promises";
import path from "node:path";

program
  .requiredOption('-h, --host <host>', 'host address')
  .requiredOption("-c, --cache <path>", "path to the input JSON file")
  .requiredOption('-p, --port <port>', 'server port', (value) => {
    const parsed = Number(value);
    if (!parsed || parsed < 1 || parsed > 65535) {
      console.error("port must be number between 1 and 65535");
      process.exit(1);
    }
    return parsed;
  })
  .parse();

const opts = program.opts();

async function setupCacheDir(path) {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (error) {
    console.log(`error: ${error.message}`);
    process.exit(1)
  }
}

const cacheDir = path.resolve(opts.cache);
await setupCacheDir(cacheDir);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('it works fine\n');
})

server.listen(opts.port, opts.host, () => {
  console.log(`server running at http://${opts.host}:${opts.port}`);
})