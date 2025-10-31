import { program } from "commander";
import http from 'node:http';
import fs from "node:fs/promises";
import path from "node:path";
import superagent from 'superagent';

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

async function readImage(code) {
  const filePath = path.join(opts.cache, `${code}.jpg`);
  try {
    const data = await fs.readFile(filePath);
    return data;
  } catch (err) {
    return null;
  }
}

async function deleteImage(code) {
  const filePath = path.join(opts.cache, `${code}.jpg`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

async function fetchImage(code) {
  try {
    const response = await superagent.get(`https://httpgoats.com/${code}.jpg`).responseType('arraybuffer');
    return Buffer.from(response.body); 
  } catch (error) {
    return null; 
  }
}

const cacheDir = path.resolve(opts.cache);
await setupCacheDir(cacheDir);

const server = http.createServer(async (req, res) => {
  const code = req.url.split('/')[1];
  const imagePath = path.join(opts.cache, `${code}.jpg`);
  if (!Number(code)) {
    res.writeHead(404);
    res.end('resource not found\n');
    return;
  }

  if (req.method === 'GET') {
    let data = await readImage(code);
    if (data) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(data);
    } else {
      console.log('making request to external server...');
      let data = await fetchImage(code);
      if (data) {
        await fs.writeFile(imagePath, data);
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(data);
      } else {
        res.writeHead(404);
        res.end("picture not found\n");
      }
    }
  } else if (req.method === 'PUT') {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      await fs.writeFile(imagePath, buffer);
      res.writeHead(201);
      res.end('image saved successfully\n');
    } catch (err) {
      res.writeHead(500);
      res.end('internal server error\n');
    }
  } else if (req.method === 'DELETE') {
    const isDeleted = await deleteImage(code);
    if (isDeleted) {
      res.writeHead(200)
      res.end('image deleted successfully\n');
    } else {
      res.writeHead(404)
      res.end('image not found\n');
    }
  } else {
    res.writeHead(405)
    res.end("method not allowed\n");
  }

})

server.listen(opts.port, opts.host, () => {
  console.log(`server running at http://${opts.host}:${opts.port}`);
})