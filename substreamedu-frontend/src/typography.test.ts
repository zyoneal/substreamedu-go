import fs from 'fs';
import path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');
const PUBLIC_INDEX_HTML = path.join(FRONTEND_ROOT, 'public', 'index.html');

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Global e-Ukraine typography enforcement', () => {
  it('declares e-Ukraine as the primary display and body font in index.css and pixzen.css', () => {
    const indexCss = fs.readFileSync(path.join(SRC_DIR, 'index.css'), 'utf8');
    const pixzenCss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'pixzen.css'), 'utf8');

    expect(indexCss).toMatch(/font-family:\s*'e-Ukraine';/);
    expect(indexCss).toMatch(/--font-display:\s*'e-Ukraine'/);
    expect(indexCss).toMatch(/--font-body:\s*'e-Ukraine'/);

    expect(pixzenCss).toMatch(/--font-display:\s*'e-Ukraine'/);
    expect(pixzenCss).toMatch(/--font-body:\s*'e-Ukraine'/);
    expect(pixzenCss).not.toMatch(/Satoshi/i);
  });

  it('does not load Satoshi or Nunito fonts in public/index.html', () => {
    const indexHtml = fs.readFileSync(PUBLIC_INDEX_HTML, 'utf8');

    expect(indexHtml).not.toMatch(/satoshi/i);
    expect(indexHtml).not.toMatch(/fontshare/i);
    expect(indexHtml).not.toMatch(/Nunito/i);
  });

  it('has zero Satoshi, Nunito, or banned Inter/SF Pro font declarations across src/', () => {
    const files = collectFiles(SRC_DIR, ['.css', '.ts', '.tsx']).filter(
      (filePath) => !filePath.endsWith('typography.test.ts')
    );

    const violations: string[] = [];
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(FRONTEND_ROOT, filePath);

      if (/\bSatoshi\b/i.test(content)) {
        violations.push(`${relPath}: references Satoshi`);
      }
      if (/['"]Nunito['"]/i.test(content)) {
        violations.push(`${relPath}: references Nunito`);
      }
      if (/["'](?:SF Pro Display|SF Pro Text|Inter)["']/.test(content)) {
        violations.push(`${relPath}: references banned SF Pro / Inter font`);
      }
    }

    expect(violations).toEqual([]);
  });
});
