import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.json': 'application/json',
};
createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      `.${decodeURIComponent(new URL(req.url, 'https://local').pathname)}`,
    );
    if (!path.startsWith(root + sep) && path !== root) {
      res.writeHead(403).end();
      return;
    }
    const file = extname(path) ? path : resolve(path, 'index.html');
    let data;
    if (new URL(req.url, 'https://local').pathname === '/runtime-config.json') {
      data = await readFile('.local/runtime-config.json');
    } else {
      data = await readFile(file);
    }
    res
      .writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () =>
  console.log(`Local: http://127.0.0.1:${process.env.PORT || 3000}`),
);
