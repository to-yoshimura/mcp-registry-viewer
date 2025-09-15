// Minimal dev server for local viewing (serves ./index.html and ./data/*)
// Usage:
//   node dev-proxy.mjs
// Then open: http://localhost:8787

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const REMOTE_BASE = 'https://registry.modelcontextprotocol.io';

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function sendCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      sendCORS(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    // Proxy for /v0/* -> https://registry.modelcontextprotocol.io/v0/*
    if (url.pathname.startsWith('/v0/')) {
      const target = `${REMOTE_BASE}${url.pathname}${url.search}`;
      const upstream = await fetch(target, { headers: { Accept: 'application/json' } });
      const body = await upstream.arrayBuffer();
      res.statusCode = upstream.status;
      // Pass through content-type if provided
      const ct = upstream.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', ct);
      sendCORS(res);
      res.end(Buffer.from(body));
      return;
    }

    // Serve static files: / -> index.html, /index.html, and /data/*
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await readFile(path.join(__dirname, 'index.html'));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      sendCORS(res);
      res.end(html);
      return;
    }

    if (url.pathname.startsWith('/data/')) {
      const rel = url.pathname.replace(/^\/data\//, '');
      const filePath = path.join(__dirname, 'data', rel);
      try {
        await stat(filePath); // ensure exists
        const body = await readFile(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', guessContentType(filePath));
        sendCORS(res);
        res.end(body);
      } catch (e) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not Found');
      }
      return;
    }

    // Fallback 404
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not Found');
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Server error: ${e?.message || e}`);
  }
});

server.listen(PORT, () => {
  console.log(`Dev proxy running at http://localhost:${PORT}`);
});
