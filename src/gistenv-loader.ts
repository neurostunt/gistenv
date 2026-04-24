import fs from 'fs';
import path from 'path';

/**
 * Resolves the path to the gistenv file (see cli entry for precedence).
 */
export function resolveGistenvPath(): string {
  const explicit = process.env.GISTENV_FILE;
  const localEnvPath = path.resolve(process.cwd(), '.gistenv');
  const homeEnvPath = path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.gistenv');
  if (explicit && fs.existsSync(path.resolve(process.cwd(), explicit))) {
    return path.resolve(process.cwd(), explicit);
  }
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }
  if (fs.existsSync(localEnvPath)) {
    return localEnvPath;
  }
  if (fs.existsSync(homeEnvPath)) {
    return homeEnvPath;
  }
  return '';
}

/**
 * Loads key=value pairs from the resolved .gistenv into process.env
 * (only if the key is not already set, matching CLI behavior).
 */
export function loadGistenvIntoProcess(): void {
  const envPath = resolveGistenvPath();
  if (envPath) {
    process.env.GISTENV_CONFIG_PATH = envPath;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
