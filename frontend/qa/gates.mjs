import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'src';
const errors = [];

function record(file, line, message) {
  errors.push(`${file}:${line} - ${message}`);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      checkFile(full);
    }
  }
}

function checkFile(file) {
  const normPath = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (lines.length > 300) {
    record(file, lines.length, `File exceeds 300 lines limit (${lines.length} lines)`);
  }

  const isCss = normPath.endsWith('.css');
  const isGraphStyle = normPath.includes('components/graph/style.ts');
  const isContent = normPath.includes('/content/');
  const isApi = normPath.startsWith('src/api/');
  const isAllowedShadow = /components\/ui\/(Drawer|Dialog|Popover|Toast|Tooltip)/.test(normPath);
  const isTest = /\.test\.(ts|tsx)$/.test(normPath);

  // Raw palette regex
  const rawPaletteRegex = /\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-\d{2,3})?\b/;
  const darkVariantRegex = /\bdark:/;
  const hexColorRegex = /#[0-9a-fA-F]{3,8}\b/;
  const rgbLiteralRegex = /\b(rgb|hsl)\(\s*\d+/; // Matches rgb(255... or hsl(120... but NOT rgb(var(--token)

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Raw palette colour classes & literals outside allowed files
    if (!isCss && !isGraphStyle && !isContent && !isTest) {
      if (rawPaletteRegex.test(line)) {
        record(file, lineNum, `Raw palette color class detected: ${line.trim()}`);
      }
      if (darkVariantRegex.test(line)) {
        record(file, lineNum, `dark: variant detected: ${line.trim()}`);
      }
      if (hexColorRegex.test(line)) {
        record(file, lineNum, `Hex color literal detected: ${line.trim()}`);
      }
      if (rgbLiteralRegex.test(line)) {
        record(file, lineNum, `rgb/hsl literal detected: ${line.trim()}`);
      }
    }

    // 2. Prohibited keywords & methods
    if (line.includes('$\\')) {
      record(file, lineNum, `Forbidden '$\\' detected`);
    }
    if (line.includes('dangerouslySetInnerHTML')) {
      record(file, lineNum, `Forbidden 'dangerouslySetInnerHTML' detected`);
    }
    if (line.includes('innerHTML')) {
      record(file, lineNum, `Forbidden 'innerHTML' detected`);
    }
    if (/\beval\(/.test(line)) {
      record(file, lineNum, `Forbidden 'eval(' detected`);
    }
    if (/\bnew\s+Function\b/.test(line)) {
      record(file, lineNum, `Forbidden 'new Function' detected`);
    }
    if (/\blocalStorage\b/.test(line)) {
      record(file, lineNum, `Forbidden 'localStorage' detected`);
    }
    if (/\bsessionStorage\b/.test(line) && !normPath.includes('auth/session')) {
      // In-memory or allowed session provider check
      record(file, lineNum, `Forbidden 'sessionStorage' detected outside session module`);
    }
    if (/\bdocument\.cookie\b/.test(line)) {
      record(file, lineNum, `Forbidden 'document.cookie' detected`);
    }
    if (/\bindexedDB\b/.test(line)) {
      record(file, lineNum, `Forbidden 'indexedDB' detected`);
    }

    // 3. Typescript escapes & eslint disables
    if (!isTest) {
      if (/:\s*any\b/.test(line) || /\bas\s+any\b/.test(line) || /<any>/.test(line)) {
        record(file, lineNum, `Forbidden 'any' type escape detected`);
      }
      if (line.includes('@ts-ignore')) {
        record(file, lineNum, `Forbidden '@ts-ignore' detected`);
      }
      if (line.includes('@ts-expect-error')) {
        record(file, lineNum, `Forbidden '@ts-expect-error' detected`);
      }
      if (line.includes('eslint-disable')) {
        record(file, lineNum, `Forbidden 'eslint-disable' detected`);
      }
    }

    // 4. Code markers and obsolete values
    if (/\bTODO\b/.test(line)) {
      record(file, lineNum, `Forbidden 'TODO' marker detected`);
    }
    if (/\bFIXME\b/.test(line)) {
      record(file, lineNum, `Forbidden 'FIXME' marker detected`);
    }
    if (/\blorem\b/i.test(line)) {
      record(file, lineNum, `Forbidden 'lorem' placeholder detected`);
    }
    if (/\bconsole\.log\(/.test(line)) {
      record(file, lineNum, `Forbidden 'console.log' call detected`);
    }
    if (/\bBorderline\b/.test(line)) {
      record(file, lineNum, `Forbidden 'Borderline' recommendation detected`);
    }

    // 6. Magic default ids
    if (/useState<number>\([^)]*\|\|\s*\d/.test(line)) {
      record(file, lineNum, `Forbidden magic default ID pattern in useState detected`);
    }
    if (/useState\(\s*\d+\s*\)/.test(line) && /(id|paper|author|reviewer|track)/i.test(line)) {
      record(file, lineNum, `Forbidden numeric magic default id in useState detected`);
    }

    // 7. External URLs
    const urlMatch = line.match(/https?:\/\/[^\s"'`]+/g);
    if (urlMatch) {
      for (const u of urlMatch) {
        if (!u.includes('localhost') && !u.includes('127.0.0.1') && !u.includes('www.w3.org')) {
          record(file, lineNum, `Forbidden external URL detected: ${u}`);
        }
      }
    }

    // 8. Fetch outside src/api/
    if (!isApi && /\bfetch\(/.test(line)) {
      record(file, lineNum, `Forbidden 'fetch(' call outside src/api/ detected`);
    }

    // 9. Design gates
    if (/\buppercase\b/.test(line) || /text-transform:\s*uppercase/.test(line)) {
      record(file, lineNum, `Forbidden 'uppercase' detected`);
    }
    if (/\btransition-all\b/.test(line) || /transition:\s*all/.test(line)) {
      record(file, lineNum, `Forbidden 'transition-all' detected`);
    }
    if (!isCss && !isAllowedShadow) {
      if (/\bshadow-(sm|md|lg|xl|2xl|inner)?\b/.test(line) || /box-shadow:/.test(line)) {
        if (!line.includes('inset')) {
          record(file, lineNum, `Forbidden drop shadow detected outside allowed overlay components`);
        }
      }
    }
    if (/\banimate-(bounce|pulse|ping)\b/.test(line)) {
      record(file, lineNum, `Forbidden Tailwind looping animation detected`);
    }
    if (/@keyframes\s+([a-zA-Z0-9_-]+)/.test(line)) {
      const match = line.match(/@keyframes\s+([a-zA-Z0-9_-]+)/);
      const name = match ? match[1] : '';
      const allowed = ['draw', 'reveal-line', 'sheet-in', 'toast-in', 'shimmer', 'spin'];
      if (!allowed.includes(name)) {
        record(file, lineNum, `Forbidden keyframe '${name}' detected`);
      }
    }
    if (/animation:[^;]*infinite/.test(line) && !line.includes('shimmer') && !line.includes('spin')) {
      record(file, lineNum, `Forbidden infinite animation detected`);
    }
  });
}

walk(SRC_DIR);

if (errors.length > 0) {
  console.error(`\x1b[31mQuality Gates Failed with ${errors.length} violation(s):\x1b[0m\n`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log(`\x1b[32mQuality Gates Passed: All checks clean across ${SRC_DIR}/\x1b[0m`);
  process.exit(0);
}
