/**
 * Live GitHub Gist API + built CLI. Not run in CI by default.
 *
 * Set real credentials in the environment or in a `.gistenv` file (same as the CLI; Vitest
 * does not read `.gistenv` unless we load it — this file does). Do not paste the Unicode
 * "…" character as a value; use the real Gist id and `ghp_…` token.
 *
 *   GISTENV_E2E=1 npm run test:e2e
 *
 * Token needs `gist` scope. Gist must contain a `.env` (or `*.env`) and at least one # [Section].
 */

import { describe, it, expect, beforeAll } from 'vitest';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGist, parseEnvContent } from '../../src/gist';
import { loadGistenvIntoProcess } from '../../src/gistenv-loader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');
const distCli = path.join(projectRoot, 'dist', 'cli.js');

function e2eEnabled(): boolean {
  if (process.env.GISTENV_E2E !== '1') return false;
  loadGistenvIntoProcess();
  const id = (process.env.GISTENV_GIST_ID || process.env.GIST_ID || '')
    .replace(/\u2026/g, '')
    .trim();
  if (!id) return false;
  return true;
}

function childEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GISTENV_GIST_ID: process.env.GISTENV_GIST_ID || process.env.GIST_ID || '',
    GISTENV_GITHUB_TOKEN: process.env.GISTENV_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
    ...overrides,
  };
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [distCli, ...args], {
    env: childEnv(),
    cwd,
    encoding: 'utf8',
  });
}

describe.skipIf(!e2eEnabled())('E2E: GitHub Gist API (manual only)', () => {
  beforeAll(() => {
    if (!fs.existsSync(distCli)) {
      throw new Error('Missing dist/cli.js — run `npm run build` before test:e2e');
    }
  });

  it('fetchGist returns content from the configured Gist', async () => {
    const { content, filename } = await fetchGist();
    expect(filename).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  it('parseEnvContent can read the gist body', async () => {
    const { content } = await fetchGist();
    const vars = parseEnvContent(content);
    expect(Array.isArray(vars)).toBe(true);
  });

  it('cli: sections exits 0', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-e2e-'));
    try {
      const r = runCli(['sections'], tmp);
      assert.equal(
        r.status,
        0,
        r.stderr || r.stdout
          ? `sections:\n${r.stdout}\n${r.stderr}`
          : 'sections exited non-zero'
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('cli: list exits 0', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-e2e-'));
    try {
      const r = runCli(['list'], tmp);
      expect(r.status).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('cli: download -o (non-interactive) writes the chosen section to a file', async () => {
    const { content } = await fetchGist();
    const all = parseEnvContent(content);
    const sectionNames = Array.from(new Set(all.map(v => v.section).filter(Boolean))) as string[];
    if (sectionNames.length === 0) {
      throw new Error('E2E: Gist must include at least one # [Name] section to test download');
    }
    const section = sectionNames[0]!;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-e2e-'));
    const outFile = 'downloaded.env';
    try {
      const r = runCli(
        ['download', '-o', outFile, '-s', section, '-m', 'replace'],
        tmp
      );
      assert.equal(
        r.status,
        0,
        r.stderr || r.stdout
          ? `download:\n${r.stdout}\n${r.stderr}`
          : 'download exited non-zero'
      );
      const p = path.join(tmp, outFile);
      expect(fs.existsSync(p)).toBe(true);
      const text = fs.readFileSync(p, 'utf8');
      expect(text).toContain(`# [${section}]`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
