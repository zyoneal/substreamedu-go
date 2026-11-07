const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Skip if requested or inside container/CI where Chromium hangs with older Puppeteer
const isDocker = fs.existsSync('/.dockerenv') || 
                 fs.existsSync('/run/.containerenv') || 
                 process.env.DOCKER_BUILD === 'true';
const isSkipped = process.env.SKIP_PRE_RENDER === 'true' || 
                  process.env.SKIP_PRERENDER === 'true';

if (isSkipped || isDocker) {
  console.log('[prerender] Skipping pre-render in container/CI environment (SKIP_PRE_RENDER or Docker detected).');
  process.exit(0);
}

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Clean up previous 200.html if present to prevent react-snap from aborting
const buildDir = path.join(__dirname, '..', 'build');
const file200 = path.join(buildDir, '200.html');
if (fs.existsSync(file200)) {
  try {
    fs.unlinkSync(file200);
  } catch (err) {
    console.warn('[prerender] Could not remove existing 200.html:', err.message);
  }
}

const chromePath = findChrome();
const env = { ...process.env };
if (chromePath) {
  env.PUPPETEER_EXECUTABLE_PATH = chromePath;
  console.log(`[prerender] Using Chrome executable: ${chromePath}`);
} else {
  console.log('[prerender] No system Chrome found, react-snap will attempt bundled browser.');
}

try {
  const snapBin = require.resolve('react-snap/run.js');
  // Maximum timeout of 45 seconds to prevent hanging any build/CI runners
  const result = spawnSync(process.execPath, [snapBin], {
    stdio: 'inherit',
    env,
    timeout: 45000,
  });

  if (result.error) {
    console.warn('[prerender] react-snap process warning:', result.error.message);
  } else if (result.status !== 0) {
    console.warn('[prerender] react-snap completed with non-zero status or warnings.');
  } else {
    console.log('[prerender] Static pre-rendering completed successfully!');
  }
} catch (err) {
  console.warn('[prerender] react-snap execution error:', err.message);
}

// Always exit 0 so static prerender issues never fail the build
process.exit(0);

