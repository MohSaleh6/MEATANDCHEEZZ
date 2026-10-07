// Cache-busting: rewrites ?v=… on CSS/JS references with a content hash so
// /css and /js can be cached forever (see public/_headers).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const hash = (file) => createHash('sha256').update(readFileSync(join(pub, file))).digest('hex').slice(0, 10);

// 1) modules imported by other modules first
const app = join(pub, 'js/app.js');
writeFileSync(app, readFileSync(app, 'utf8').replace(/from '\.\/i18n\.js(\?v=[\w]+)?'/, `from './i18n.js?v=${hash('js/i18n.js')}'`));

// 2) HTML references
for (const page of ['index.html', 'admin/index.html']) {
  const path = join(pub, page);
  let html;
  try { html = readFileSync(path, 'utf8'); } catch { continue; }
  html = html.replace(/(["'])(\/(?:css|js|admin)\/[\w./-]+\.(?:css|js))\?v=[\w]+\1/g, (_, q, file) => `${q}${file}?v=${hash(file.slice(1))}${q}`);
  writeFileSync(path, html);
}
console.log('stamped asset versions');
