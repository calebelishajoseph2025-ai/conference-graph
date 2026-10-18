import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseCssTokens(css: string): { defaultScope: Record<string, Rgb>; inverseScope: Record<string, Rgb> } {
  const defaultScope: Record<string, Rgb> = {};
  const inverseScope: Record<string, Rgb> = {};

  const defaultMatch = css.match(/:root[\s\S]*?\{([\s\S]*?)\}/);
  const inverseMatch = css.match(/\[data-theme="inverse"\][\s\S]*?\{([\s\S]*?)\}/);

  const extractTokens = (block: string, target: Record<string, Rgb>) => {
    const lines = block.split('\n');
    for (const line of lines) {
      const match = line.match(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/);
      if (match) {
        target[`--${match[1]}`] = {
          r: parseInt(match[2], 10),
          g: parseInt(match[3], 10),
          b: parseInt(match[4], 10),
        };
      }
    }
  };

  if (defaultMatch) extractTokens(defaultMatch[1], defaultScope);
  if (inverseMatch) extractTokens(inverseMatch[1], inverseScope);

  return { defaultScope, inverseScope };
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('tokens.test.ts: WCAG contrast ratio verification', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const cssPath = path.resolve(currentDir, 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const { defaultScope, inverseScope } = parseCssTokens(cssContent);

  const fgKeys = ['--text', '--text-muted', '--text-faint', '--accent-text'];

  describe('Default dark scope (:root)', () => {
    const bgKeys = ['--bg', '--surface', '--surface-2', '--surface-3'];

    for (const fg of fgKeys) {
      for (const bg of bgKeys) {
        it(`ensures ${fg} against ${bg} has contrast >= 4.5:1`, () => {
          const fgRgb = defaultScope[fg];
          const bgRgb = defaultScope[bg];
          expect(fgRgb).toBeDefined();
          expect(bgRgb).toBeDefined();

          const ratio = contrastRatio(fgRgb, bgRgb);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });

  describe('Inverse light scope ([data-theme="inverse"])', () => {
    const bgKeys = ['--bg', '--surface'];

    for (const fg of fgKeys) {
      for (const bg of bgKeys) {
        it(`ensures ${fg} against ${bg} has contrast >= 4.5:1`, () => {
          const fgRgb = inverseScope[fg];
          const bgRgb = inverseScope[bg];
          expect(fgRgb).toBeDefined();
          expect(bgRgb).toBeDefined();

          const ratio = contrastRatio(fgRgb, bgRgb);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });
});
