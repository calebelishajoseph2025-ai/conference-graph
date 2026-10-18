import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs)$/.test(entry)) {
      const count = fs.readFileSync(full, 'utf8').split('\n').length;
      if (count > 300) console.log(count, full);
    }
  }
}
walk(process.argv[2] ?? 'src');
