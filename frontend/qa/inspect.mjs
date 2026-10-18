import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('src/content/projectContent.json', 'utf8'));
console.log(JSON.stringify(c.demoSteps.map((s) => ({ step: s.step, pageId: s.pageId, verify: s.verify, params: s.params })), null, 1));
console.log(JSON.stringify(c.pathPresets, null, 1));
