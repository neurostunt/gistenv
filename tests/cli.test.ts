import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { program } from '../src/cli-commands.js';

const fetchGistMock = vi.fn();
const updateGistMock = vi.fn();

vi.mock('../src/gist', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/gist')>();
  return {
    ...mod,
    fetchGist: (...a: unknown[]) => fetchGistMock(...a) as ReturnType<typeof mod.fetchGist>,
    updateGist: (...a: unknown[]) => updateGistMock(...a) as ReturnType<typeof mod.updateGist>,
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
    process.exitCode = undefined;
    fetchGistMock.mockReset();
    updateGistMock.mockReset();
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
    process.exitCode = undefined;
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
    expect(process.exitCode).toBe(1);

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

describe('CLI — upload (non-interactive)', () => {
  const prevCwd = process.cwd();
  const prevGist = process.env.GISTENV_GIST_ID;
  const prevGistId = process.env.GIST_ID;
  const prevHome = process.env.HOME;
  const prevArgv = [...process.argv];
  const prevEnc = process.env.GISTENV_ENCRYPTION_KEY;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gistenv-cli-'));
    process.chdir(tmpDir);
    process.env.HOME = tmpDir;
    process.env.GISTENV_GIST_ID = 'test-gist-id';
    delete (process.env as { GIST_ID?: string }).GIST_ID;
    delete (process.env as { GISTENV_ENCRYPTION_KEY?: string }).GISTENV_ENCRYPTION_KEY;
    process.exitCode = undefined;
    fetchGistMock.mockReset();
    updateGistMock.mockReset();
    updateGistMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    process.env.GISTENV_GIST_ID = prevGist;
    if (prevGistId !== undefined) {
      process.env.GIST_ID = prevGistId;
    } else {
      delete (process.env as { GIST_ID?: string }).GIST_ID;
    }
    if (prevEnc !== undefined) {
      process.env.GISTENV_ENCRYPTION_KEY = prevEnc;
    } else {
      delete (process.env as { GISTENV_ENCRYPTION_KEY?: string }).GISTENV_ENCRYPTION_KEY;
    }
    process.env.HOME = prevHome;
    process.argv = prevArgv;
    process.exitCode = undefined;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  it('upload file --section Name adds a new section without prompting', async () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'NEW=1\n', 'utf8');
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Existing]
OLD=0
`)
    );

    const argv = ['upload', '.env', '--section', 'traktv'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    expect(updateGistMock).toHaveBeenCalledTimes(1);
    const [, content] = updateGistMock.mock.calls[0] as [string, string];
    expect(content).toContain('# [Existing]');
    expect(content).toContain('OLD=0');
    expect(content).toContain('# [traktv]');
    expect(content).toContain('NEW=1');
    expect(process.exitCode).toBeUndefined();
  });

  it('upload --section replaces an existing section instead of duplicating', async () => {
    fs.writeFileSync(path.join(tmpDir, 'local.env'), 'NEW=2\n', 'utf8');
    fetchGistMock.mockResolvedValue(
      mockGistContent(`# [Keep]
A=1

# [traktv]
OLD=1

# [Other]
B=2
`)
    );

    const argv = ['upload', 'local.env', '-s', 'traktv'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    expect(updateGistMock).toHaveBeenCalledTimes(1);
    const [, content] = updateGistMock.mock.calls[0] as [string, string];
    expect(content).toContain('# [Keep]');
    expect(content).toContain('# [Other]');
    expect(content).toContain('# [traktv]');
    expect(content).toContain('NEW=2');
    expect(content).not.toContain('OLD=1');
    expect(content.match(/# \[traktv\]/g)?.length).toBe(1);
  });

  it('upload missing file sets exitCode 1', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const argv = ['upload', 'missing.env', '--section', 'X'];
    process.argv = ['node', 'gistenv', ...argv];
    await program.parseAsync(argv, { from: 'user' });

    expect(updateGistMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(String(errSpy.mock.calls[0]?.[0])).toMatch(/File not found/i);
    errSpy.mockRestore();
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
    process.exitCode = undefined;
    fetchGistMock.mockReset();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    process.env.GISTENV_GIST_ID = prevGist;
    process.env.HOME = prevHome;
    process.argv = prevArgv;
    process.exitCode = undefined;
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
