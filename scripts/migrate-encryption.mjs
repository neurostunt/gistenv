#!/usr/bin/env node
/**
 * Migration script: re-encrypts all Gist values with current IV_LENGTH (12).
 * Handles: plain text, IV=16, IV=12, and double-encrypted values.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load .gistenv
function loadConfig() {
  const localPath = path.join(rootDir, '.gistenv');
  const homePath = path.join(process.env.HOME || '', '.gistenv');
  const configPath = fs.existsSync(localPath) ? localPath : fs.existsSync(homePath) ? homePath : null;
  if (!configPath) throw new Error('No .gistenv file found');
  const lines = fs.readFileSync(configPath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadConfig();

const { fetchGist, updateGist, parseEnvContent, encryptEnvContent } = await import('../dist/gist.js');
const { getEncryptionKey } = await import('../dist/crypto.js');

const key = getEncryptionKey();
if (!key) {
  console.error('Error: GISTENV_ENCRYPTION_KEY not set in .gistenv');
  process.exit(1);
}

console.log('Fetching Gist...');
const { content, filename } = await fetchGist();

// Parse WITH decryption — gets plain text values (handles all legacy layouts via fallback)
const variables = parseEnvContent(content, true);

// Reconstruct plain-text Gist content preserving section structure
let plainContent = '';
let currentSection = null;
for (const v of variables) {
  if (v.section !== currentSection) {
    currentSection = v.section;
    if (plainContent) plainContent += '\n';
    plainContent += `# [${currentSection}]\n`;
  }
  plainContent += `${v.key}=${v.value}\n`;
}

console.log(`Decrypted ${variables.length} variables across sections:`);
const sections = [...new Set(variables.map(v => v.section).filter(Boolean))];
sections.forEach(s => {
  const count = variables.filter(v => v.section === s).length;
  console.log(`  - ${s} (${count} vars)`);
});

// Re-encrypt everything with current IV_LENGTH (12)
const reencrypted = encryptEnvContent(plainContent);

console.log('\nPushing re-encrypted content to Gist...');
await updateGist(filename, reencrypted);

console.log('✓ Migration complete — all values re-encrypted with IV=12');
