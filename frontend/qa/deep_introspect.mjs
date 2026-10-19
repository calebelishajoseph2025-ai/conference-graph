import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const playwright = await import('playwright');
  const chromium = playwright.chromium;

  const BASE_URL = 'http://localhost:5173';
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));

  const findings = [];

  // 1. Audit Home Page sections
  console.log('Auditing Home page...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  const homeOverflows = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 && window.getComputedStyle(el).overflowX === 'visible') {
        const tag = el.tagName.toLowerCase();
        const cls = el.className;
        issues.push({ tag, cls, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
      }
    });
    return issues;
  });
  if (homeOverflows.length > 0) {
    findings.push({ page: 'Home', issues: homeOverflows });
  }

  // Check all sections on Home
  const sectionChecks = await page.evaluate(() => {
    const sections = ['top', 'overview', 'comparison', 'architecture', 'features', 'choose'];
    return sections.map(id => {
      const el = document.getElementById(id);
      return {
        id,
        exists: !!el,
        visible: el ? el.getBoundingClientRect().height > 0 : false
      };
    });
  });
  console.log('Section checks:', sectionChecks);

  // 2. Audit Workspace Routes
  const routes = [
    { role: 'evaluator', path: '/app/walkthrough' },
    { role: 'chair', path: '/app/overview' },
    { role: 'chair', path: '/app/papers' },
    { role: 'chair', path: '/app/assignments' },
    { role: 'chair', path: '/app/reviews' },
    { role: 'chair', path: '/app/graph' },
    { role: 'chair', path: '/app/paths' },
    { role: 'chair', path: '/app/analytics' },
    { role: 'chair', path: '/app/benchmark' },
    { role: 'chair', path: '/app/schema' },
    { role: 'reviewer', path: '/app/my-reviews' },
    { role: 'author', path: '/app/my-papers' },
    { role: 'admin', path: '/app/admin', adminToken: 'da3-secret-admin-token' },
  ];

  for (const r of routes) {
    console.log(`Auditing ${r.role} at ${r.path}...`);
    await page.evaluate(({ role, token }) => {
      sessionStorage.setItem('cg:session:v1', JSON.stringify({
        persona: role,
        identity: role === 'author' ? { kind: 'author', id: 1, name: 'Emma Krishnan' } :
                  role === 'reviewer' ? { kind: 'reviewer', id: 2, name: 'Dr. David Nair' } : null,
        adminToken: token ?? null
      }));
    }, { role: r.role, token: r.adminToken });

    await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const routeIssues = await page.evaluate(() => {
      const issues = [];
      // check horizontal overflow on document
      if (document.documentElement.scrollWidth > window.innerWidth) {
        issues.push({ type: 'page_horizontal_scroll', scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth });
      }
      // check broken images
      document.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          issues.push({ type: 'broken_image', src: img.src, alt: img.alt });
        }
      });
      // check buttons with missing text or broken layout
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.innerText.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        if (!text && !ariaLabel && !btn.querySelector('svg')) {
          issues.push({ type: 'empty_button', outerHTML: btn.outerHTML.slice(0, 100) });
        }
      });
      // check any text elements overlapping
      return issues;
    });

    if (routeIssues.length > 0) {
      findings.push({ route: r.path, issues: routeIssues });
    }
  }

  console.log('--- AUDIT FINDINGS ---');
  console.log(JSON.stringify({ findings, consoleMessages }, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
