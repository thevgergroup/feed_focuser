import { createWriteStream, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const extDir = join(root, 'extension');

mkdirSync(distDir, { recursive: true });

// Simple zip writer using Node's built-in zlib
// We use archiver-style approach with the 'archiver' pattern but via streams
// Since we want zero extra deps, we shell out to zip (available on macOS/Linux)
import { execSync } from 'child_process';

// Chrome build — all extension files as-is
const chromeZip = join(distDir, 'feed-focuser-chrome.zip');
execSync(`cd "${root}" && zip -r "${chromeZip}" extension/ -x "*.DS_Store"`, { stdio: 'inherit' });
console.log(`✓ ${chromeZip}`);

// Firefox build — same source, manifest already has gecko settings
const firefoxZip = join(distDir, 'feed-focuser-firefox.zip');
execSync(`cd "${root}" && zip -r "${firefoxZip}" extension/ -x "*.DS_Store"`, { stdio: 'inherit' });
console.log(`✓ ${firefoxZip}`);

console.log('\nBuild complete. Files in dist/');
