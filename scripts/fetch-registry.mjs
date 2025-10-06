// Build-time fetcher: pulls all MCP registry servers and writes chunked JSON to ./data
// Usage: node scripts/fetch-registry.mjs [--limit=100]
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://registry.modelcontextprotocol.io/v0';
const outDir = path.resolve('data');
// Registry API enforces limit <= 100. Clamp user input accordingly.
const rawLimit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 100);
const limitArg = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? rawLimit : 100));

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${t}`);
  }
  return r.json();
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const chunks = [];
  let cursor; let page = 1; let totalItems = 0;
  const pageSize = limitArg;
  while (true) {
    const qs = new URLSearchParams();
    qs.set('limit', String(pageSize));
    if (cursor) qs.set('cursor', cursor);
    const url = `${BASE}/servers?${qs.toString()}`;
    // eslint-disable-next-line no-console
    console.log(`Fetching page ${page}: ${url}`);
    const data = await fetchJSON(url);
    const servers = Array.isArray(data.servers) ? data.servers : (Array.isArray(data.items) ? data.items : []);
    await fs.writeFile(path.join(outDir, `page-${page}.json`), JSON.stringify({ servers }, null, 2));
    chunks.push({ page, count: servers.length });
    totalItems += servers.length;
    cursor = data?.metadata?.next_cursor || null;
    if (!cursor) break;
    page += 1;
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    pageSize,
    totalItems,
    files: chunks.map((chunk) => ({
      page: chunk.page,
      file: `page-${chunk.page}.json`,
      count: chunk.count
    }))
  };
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${chunks.length} pages (${totalItems} items) to ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
