import { describe, expect, it } from 'vitest';
import { sanitizeCsvCell } from './csv';

describe('csv.test.ts: CSV Sanitization and Formula Injection Protection', () => {
  it('neutralizes leading equals sign (=)', () => {
    const raw = '=SUM(A1:B10)';
    const result = sanitizeCsvCell(raw);
    expect(result).toBe("\"'=SUM(A1:B10)\"");
  });

  it('neutralizes leading plus (+), minus (-), and at (@) signs', () => {
    expect(sanitizeCsvCell('+12345')).toBe("\"'+12345\"");
    expect(sanitizeCsvCell('-100')).toBe("\"'-100\"");
    expect(sanitizeCsvCell('@SUM(1,2)')).toBe("\"'@SUM(1,2)\"");
  });

  it('neutralizes leading tab and carriage return characters', () => {
    expect(sanitizeCsvCell('\tmalicious')).toBe("\"'\tmalicious\"");
    expect(sanitizeCsvCell('\rmalicious')).toBe("\"'\rmalicious\"");
  });

  it('neutralizes spreadsheet shell commands and DDE execution vectors', () => {
    const command = "=cmd|' /C calc'!A0";
    const sanitized = sanitizeCsvCell(command);
    expect(sanitized.startsWith("\"'=")).toBe(true);
  });

  it('escapes internal double quotes properly', () => {
    expect(sanitizeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
  });

  it('handles null and undefined safely as empty quotes', () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
  });

  it('handles numbers and booleans correctly', () => {
    expect(sanitizeCsvCell(42)).toBe('"42"');
    expect(sanitizeCsvCell(true)).toBe('"true"');
    expect(sanitizeCsvCell(false)).toBe('"false"');
  });

  it('handles standard clean text without prepending single quotes', () => {
    expect(sanitizeCsvCell('Normal Paper Title')).toBe('"Normal Paper Title"');
  });
});
