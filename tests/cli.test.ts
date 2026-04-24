import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { program } from '../src/cli-commands.js';

const fetchGistMock = vi.fn();

vi.mock('../src/gist', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/gist')>();
  return {
    ...mod,
    fetchGist: (...a: unknown[]) => fetchGistMock(...a) as ReturnType<typeof mod.fetchGist>,
  };
});

const mockGistContent = (body: string) => ({
  content: body,
  filename: '.env',
});

describe('CLI — download (non-interactive)', () => {
  const prevCwd = process.cwd();
  const prevGist = process.env.GISTENV_GIST_ID;
  const prevGistId = process.env.GIST_ID;
  const prevHome = process.env.HOME;
  const prevArgv = [...process.argv];
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-cli-'));
    process.chdir(tmpDir);
    process.env.HOME = tmpDir; // no accidental .gistenv from home
    process.env.GISTENV_GIST_ID = 'test-gist-id';
    process.env.GIST_ID = undefined;
    delete (process.env as { GIST_ID?: string }).GIST_ID;
    fetchGistMock.mockReset();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    process.env.GISTENV_GIST_ID = prevGist;
    if (prevGistId !== undefined) {
      process.env.GIST_ID = prevGistId;
    } else {
      delete (process.env as { GIST_ID?: string }).GIST_ID;
    }
    process.env.HOME = prevHome;
    process.argv = prevArgv;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  it('download -o .env -s <section> -m replace writes the section to the output file', async () => {
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Staging]
K1=one
K2=two
`)
    );

    const argv = ['download', '-o', '.env', '-s', 'Staging', '-m', 'replace'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    const written = fs.readFileSync(path.join(tmpDir, '.env'), 'utf8');
    expect(written).toContain('# [Staging]');
    expect(written).toContain('K1=one');
    expect(written).toContain('K2=two');
  });

  it('download with custom -o path writes to that file', async () => {
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Prod]
X=1
`)
    );

    const argv = ['download', '-o', 'local.env', '-s', 'Prod', '-m', 'replace'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    const outPath = path.join(tmpDir, 'local.env');
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.readFileSync(outPath, 'utf8')).toContain('X=1');
  });

  it('download -m append keeps existing file and appends the section', async () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'OLD=1\n', 'utf8');
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Next]
A=b
`)
    );

    const argv = ['download', '-o', '.env', '-s', 'Next', '-m', 'append'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    const written = fs.readFileSync(path.join(tmpDir, '.env'), 'utf8');
    expect(written).toContain('OLD=1');
    expect(written).toContain('# --- Added by gistenv ---');
    expect(written).toContain('A=b');
  });

  it('download with unknown -s does not write a file and reports error on stderr', async () => {
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Only]
A=b
`)
    );

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const argv = ['download', '-o', 'out.env', '-s', 'Missing', '-m', 'replace'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    expect(errSpy).toHaveBeenCalled();
    const errMsg = (errSpy.mock.calls[0] as [string])[0] as string;
    expect(String(errMsg)).toContain('not found');
    expect(String(errMsg)).toContain('Only');

    errSpy.mockRestore();
    expect(fs.existsSync(path.join(tmpDir, 'out.env'))).toBe(false);
  });

  it('download when Gist has no # [Section] blocks logs and does not create output', async () => {
    fetchGistMock.mockResolvedValue(
      mockGistContent('FOO=unsectioned\n')
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const argv = ['download', '-o', 'out.env', '-s', 'Any', '-m', 'replace'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    const out = logSpy.mock.calls.map(c => c.join(' ')).join(' ');
    expect(out).toMatch(/No sections found/i);
    logSpy.mockRestore();
    expect(fs.existsSync(path.join(tmpDir, 'out.env'))).toBe(false);
  });
});

describe('CLI — sections (mocked fetch)', () => {
  const prevCwd = process.cwd();
  const prevGist = process.env.GISTENV_GIST_ID;
  const prevHome = process.env.HOME;
  const prevArgv = [...process.argv];
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-cli-'));
    process.chdir(tmpDir);
    process.env.HOME = tmpDir;
    process.env.GISTENV_GIST_ID = 'test-gist';
    fetchGistMock.mockReset();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    process.env.GISTENV_GIST_ID = prevGist;
    process.env.HOME = prevHome;
    process.argv = prevArgv;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('sections prints list of section names', async () => {
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [A]
X=1

# [B]
Y=2
`)
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const argv = ['sections'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    const all = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(all).toContain('A');
    expect(all).toContain('B');
    logSpy.mockRestore();
  });
});
