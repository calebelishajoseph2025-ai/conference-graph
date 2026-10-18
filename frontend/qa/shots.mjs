import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  let chromium;
  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
  } catch (err) {
    console.error('Playwright not found. Install it via `npm install -D @playwright/test playwright`');
    process.exit(1);
  }

  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
  const outDir = path.resolve(__dirname, 'screens');

  const viewports = [
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1920x1080', width: 1920, height: 1080 },
  ];

  const personas = [
    { id: 'evaluator', landing: '/app/walkthrough' },
    { id: 'chair', landing: '/app/overview' },
    { id: 'reviewer', landing: '/app/my-reviews' },
    { id: 'author', landing: '/app/my-papers' },
    { id: 'admin', landing: '/app/admin' },
  ];

  console.log(`Starting automated screenshot capture targeting ${BASE_URL}...`);
  const browser = await chromium.launch();

  try {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

      // 1. Home
      console.log(`Capturing Home [${vp.name}]...`);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      const homeDir = path.join(outDir, 'home');
      fs.mkdirSync(homeDir, { recursive: true });
      await page.screenshot({ path: path.join(homeDir, `home-${vp.name}.png`), fullPage: true });

      // 2. Personas and pages
      for (const p of personas) {
        const pDir = path.join(outDir, p.id);
        fs.mkdirSync(pDir, { recursive: true });

        // Seed session into storage
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.evaluate((personaId) => {
          window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
            persona: personaId,
            identity: personaId === 'author' ? { kind: 'author', id: 1, name: 'Emma Krishnan' } :
                      personaId === 'reviewer' ? { kind: 'reviewer', id: 2, name: 'Dr. David Nair' } : undefined,
            adminToken: personaId === 'admin' ? (window.__ADMIN_TOKEN__ || 'da3-secret-admin-token') : undefined
          }));
        }, p.id);

        await page.goto(`${BASE_URL}${p.landing}`, { waitUntil: 'networkidle' }).catch(() => {});
        const safePageName = p.landing.replace(/^\/app\//, '').replace(/\//g, '-');
        await page.screenshot({ path: path.join(pDir, `${safePageName}-${vp.name}.png`) });
      }

      await page.close();
    }

    // Mobile home shot (390x844)
    console.log('Capturing Home mobile [390x844]...');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: path.join(outDir, 'home', 'home-390x844.png'), fullPage: true });
    await mobilePage.close();

    console.log(`Screenshots cleanly saved in ${outDir}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot run failed:', err.message);
  process.exit(1);
});
