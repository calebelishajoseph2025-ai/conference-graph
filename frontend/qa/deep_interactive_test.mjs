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

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  // 1. Reviewer Score Slider & Review Form
  console.log('Testing Reviewer Score Slider & Form...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'reviewer',
      identity: { kind: 'reviewer', id: 2, name: 'Dr. David Nair' }
    }));
  });
  await page.goto(`${BASE_URL}/app/my-reviews`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Click on the first pending assigned paper (Paper #16)
  const pendingPaper = await page.$('text=A Study of Approximate Nearest Neighbour');
  if (pendingPaper) {
    await pendingPaper.click();
    await page.waitForTimeout(400);
    const shotReviewForm = path.join(outDir, '12_reviewer_form_slider.png');
    await page.screenshot({ path: shotReviewForm });
    fs.copyFileSync(shotReviewForm, path.join(brainDir, '12_reviewer_form_slider.png'));
  }

  // 2. Author Paths & Graph Canvas
  console.log('Testing Author Collaboration Paths...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'author',
      identity: { kind: 'author', id: 1, name: 'Emma Krishnan' }
    }));
  });
  await page.goto(`${BASE_URL}/app/paths`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Click preset "1 -> 60 3 hops"
  const presetBtn = await page.$('button:has-text("1 → 60")');
  if (presetBtn) {
    await presetBtn.click();
    await page.waitForTimeout(800); // Wait for Cytoscape layout
    const shotPathPreset = path.join(outDir, '13_author_shortest_path_graph.png');
    await page.screenshot({ path: shotPathPreset });
    fs.copyFileSync(shotPathPreset, path.join(brainDir, '13_author_shortest_path_graph.png'));
  }

  // Test Within N hops (Reach panel)
  const reachTab = await page.$('button:has-text("Within N hops")');
  if (reachTab) {
    await reachTab.click();
    await page.waitForTimeout(800);
    const shotReach = path.join(outDir, '14_author_reach_graph.png');
    await page.screenshot({ path: shotReach });
    fs.copyFileSync(shotReach, path.join(brainDir, '14_author_reach_graph.png'));
  }

  // 3. Evaluator Walkthrough Verification Chips
  console.log('Testing Evaluator Walkthrough Live Verification...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'evaluator'
    }));
  });
  await page.goto(`${BASE_URL}/app/walkthrough`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Click "Verify live" on Step 01
  const verifyBtn = await page.$('button:has-text("Verify live")');
  if (verifyBtn) {
    await verifyBtn.click();
    await page.waitForTimeout(1000); // Wait for API response
    const shotVerified = path.join(outDir, '15_evaluator_step_verified.png');
    await page.screenshot({ path: shotVerified });
    fs.copyFileSync(shotVerified, path.join(brainDir, '15_evaluator_step_verified.png'));
  }

  // 4. Program Chair Reviewer Assignment Risky Pair
  console.log('Testing Chair Assignment Risky Pair...');
  await page.evaluate(() => {
    window.sessionStorage.setItem('conference_graph_session', JSON.stringify({
      persona: 'chair'
    }));
  });
  await page.goto(`${BASE_URL}/app/assignments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const riskyBtn = await page.$('button:has-text("Try the risky pair"), button:has-text("Open paper #1")');
  if (riskyBtn) {
    await riskyBtn.click();
    await page.waitForTimeout(800);
    const shotRisky = path.join(outDir, '16_chair_assignment_conflict.png');
    await page.screenshot({ path: shotRisky });
    fs.copyFileSync(shotRisky, path.join(brainDir, '16_chair_assignment_conflict.png'));
  }

  // 5. Graph Explorer Page
  console.log('Testing Graph Explorer Cytoscape canvas...');
  await page.goto(`${BASE_URL}/app/graph?type=paper&id=1&depth=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Cytoscape layout
  const shotExplorer = path.join(outDir, '17_graph_explorer.png');
  await page.screenshot({ path: shotExplorer });
  fs.copyFileSync(shotExplorer, path.join(brainDir, '17_graph_explorer.png'));

  console.log('Deep interactive testing complete.');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
