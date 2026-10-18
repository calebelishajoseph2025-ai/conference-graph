import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const playwright = await import('playwright');
  const chromium = playwright.chromium;

  const BASE_URL = 'http://localhost:5173';
  const outDir = path.resolve(__dirname, 'screens');
  const brainDir = 'C:/Users/Caleb EJ/.gemini/antigravity/brain/83d63064-5ffd-48f2-89ae-728db8b36e65';

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(brainDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));

  console.log('--- 1. LANDING PAGE AUDIT ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  // 1a. Desktop 1366x768
  const shot1 = path.join(outDir, '01_landing_desktop_1366x768.png');
  await page.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, path.join(brainDir, '01_landing_desktop_1366x768.png'));

  // 1b. Full page
  const shot1Full = path.join(outDir, '01_landing_fullpage.png');
  await page.screenshot({ path: shot1Full, fullPage: true });
  fs.copyFileSync(shot1Full, path.join(brainDir, '01_landing_fullpage.png'));

  // Inspect Hero stats & graph
  const heroStats = await page.evaluate(() => {
    const hero = document.querySelector('section');
    const svg = hero ? hero.querySelector('svg') : null;
    const stats = Array.from(hero?.querySelectorAll('.tabular') || []).map(el => el.textContent.trim());
    return {
      hasSvg: !!svg,
      svgBox: svg ? svg.getBoundingClientRect() : null,
      stats,
    };
  });
  console.log('Hero inspection:', JSON.stringify(heroStats));

  // Inspect Live Proof strip
  const liveProofStats = await page.evaluate(() => {
    const el = document.getElementById('proof') || document.querySelector('section:nth-of-type(2)');
    const cards = Array.from(document.querySelectorAll('#proof [role="region"], #proof dl, #proof .tabular')).map(e => e.textContent.trim());
    return { textSnippet: el?.innerText.slice(0, 300) };
  });
  console.log('Live Proof snippet:', liveProofStats);

  // 1c. Why section (Inverse scope)
  const whyEl = await page.$('#why');
  if (whyEl) {
    await whyEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shotWhy = path.join(outDir, '02_why_section_inverse.png');
    await whyEl.screenshot({ path: shotWhy });
    fs.copyFileSync(shotWhy, path.join(brainDir, '02_why_section_inverse.png'));
  }

  // 1d. Team section
  const teamEl = await page.$('#team');
  if (teamEl) {
    await teamEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shotTeam = path.join(outDir, '03_team_section.png');
    await teamEl.screenshot({ path: shotTeam });
    fs.copyFileSync(shotTeam, path.join(brainDir, '03_team_section.png'));
  }

  console.log('--- 2. FIVE-PERSONA INTERACTIVE JOURNEYS ---');

  // Journey A: Evaluator (/app/walkthrough)
  console.log('Journey A: Evaluator (/app/walkthrough)...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'evaluator'
    }));
  });
  await page.goto(`${BASE_URL}/app/walkthrough`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const shotWalkthrough = path.join(outDir, '04_evaluator_walkthrough.png');
  await page.screenshot({ path: shotWalkthrough });
  fs.copyFileSync(shotWalkthrough, path.join(brainDir, '04_evaluator_walkthrough.png'));

  // Journey B: Program Chair (/app/overview, /app/papers, /app/assignments)
  console.log('Journey B: Program Chair...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'chair'
    }));
  });
  await page.goto(`${BASE_URL}/app/overview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const shotOverview = path.join(outDir, '05_chair_overview.png');
  await page.screenshot({ path: shotOverview });
  fs.copyFileSync(shotOverview, path.join(brainDir, '05_chair_overview.png'));

  // Chair: Papers & Slide-out Drawer
  await page.goto(`${BASE_URL}/app/papers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Click first paper row or title to open drawer
  const paperRow = await page.$('table tbody tr');
  if (paperRow) {
    await paperRow.click();
    await page.waitForTimeout(400); // Wait for drawer transition
    const shotDrawer = path.join(outDir, '06_chair_paper_drawer.png');
    await page.screenshot({ path: shotDrawer });
    fs.copyFileSync(shotDrawer, path.join(brainDir, '06_chair_paper_drawer.png'));

    // Close drawer via Escape or close button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Chair: Assignments
  await page.goto(`${BASE_URL}/app/assignments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const shotAssignments = path.join(outDir, '07_chair_assignments.png');
  await page.screenshot({ path: shotAssignments });
  fs.copyFileSync(shotAssignments, path.join(brainDir, '07_chair_assignments.png'));

  // Journey C: Reviewer (/app/my-reviews)
  console.log('Journey C: Reviewer (/app/my-reviews)...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'reviewer',
      identity: { kind: 'reviewer', id: 2, name: 'Dr. David Nair' }
    }));
  });
  await page.goto(`${BASE_URL}/app/my-reviews`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Check if review item exists and open review form/detail if applicable
  const reviewCard = await page.$('button:has-text("Review"), button:has-text("Open"), table tbody tr');
  if (reviewCard) {
    await reviewCard.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  const shotReviews = path.join(outDir, '08_reviewer_my_reviews.png');
  await page.screenshot({ path: shotReviews });
  fs.copyFileSync(shotReviews, path.join(brainDir, '08_reviewer_my_reviews.png'));

  // Journey D: Author (/app/my-papers, /app/paths)
  console.log('Journey D: Author (/app/my-papers, /app/paths)...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'author',
      identity: { kind: 'author', id: 1, name: 'Emma Krishnan' }
    }));
  });
  await page.goto(`${BASE_URL}/app/my-papers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const shotAuthorPapers = path.join(outDir, '09_author_my_papers.png');
  await page.screenshot({ path: shotAuthorPapers });
  fs.copyFileSync(shotAuthorPapers, path.join(brainDir, '09_author_my_papers.png'));

  // Author Paths
  await page.goto(`${BASE_URL}/app/paths`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800); // Cytoscape graph layout
  const shotPaths = path.join(outDir, '10_author_paths.png');
  await page.screenshot({ path: shotPaths });
  fs.copyFileSync(shotPaths, path.join(brainDir, '10_author_paths.png'));

  // Journey E: Administrator (/app/admin)
  console.log('Journey E: Administrator (/app/admin)...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'admin',
      adminToken: 'da3-secret-admin-token'
    }));
  });
  await page.goto(`${BASE_URL}/app/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Trigger reset dialog
  const resetButton = await page.$('button:has-text("Reset"), button:has-text("Re-seed")');
  if (resetButton) {
    await resetButton.click();
    await page.waitForTimeout(300);
  }
  const shotAdmin = path.join(outDir, '11_admin_reset_modal.png');
  await page.screenshot({ path: shotAdmin });
  fs.copyFileSync(shotAdmin, path.join(brainDir, '11_admin_reset_modal.png'));

  console.log('--- AUDIT FINISHED ---');
  console.log('Console logs captured:', consoleLogs.length);
  if (consoleLogs.length > 0) {
    console.log(consoleLogs.slice(0, 10).join('\n'));
  }

  await browser.close();
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
