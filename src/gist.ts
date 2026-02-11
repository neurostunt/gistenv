import { encryptValue, decryptValue, getEncryptionKey } from './crypto';

// Inline EnvVariable type
type EnvVariable = {
  key: string;
  value: string;
  section?: string;
};

interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  truncated: boolean;
  content: string;
}

interface GistResponse {
  files: Record<string, GistFile>;
  id: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string;
}

export interface GistEnvFile {
  content: string;
  filename: string;
}

function getAuth(): { gistId: string; githubToken?: string } {
  const gistId = process.env.GISTENV_GIST_ID || process.env.GIST_ID;
  const githubToken = process.env.GISTENV_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!gistId) {
    const cwd = process.cwd();
    const home = process.env.HOME || process.env.USERPROFILE || '~';
    throw new Error(
      'Gist ID not set. Add a .gistenv file in this directory or in your home with GISTENV_GIST_ID and GISTENV_GITHUB_TOKEN.\n' +
      `  Looked in: ${cwd}/.gistenv and ${home}/.gistenv\n` +
      '  Or set GISTENV_FILE=/path/to/.gistenv'
    );
  }
  return { gistId, githubToken };
}

function getHeaders(): Record<string, string> {
  const { githubToken } = getAuth();
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' };
  if (githubToken) headers['Authorization'] = `token ${githubToken}`;
  return headers;
}

export const fetchGist = async (): Promise<GistEnvFile> => {
  const { gistId } = getAuth();
  const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers: getHeaders() });

  if (!response.ok) {
    if (response.status === 404) throw new Error('Gist not found. Check your Gist ID.');
    if (response.status === 401) throw new Error('Invalid GitHub token. Set GISTENV_GITHUB_TOKEN or GITHUB_TOKEN in your .gistenv or environment.');
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GistResponse;
  const envFile = Object.values(data.files).find(file =>
    file.filename.endsWith('.env') || file.filename === '.env'
  );
  if (!envFile) throw new Error('No .env file found in the Gist');
  return { content: envFile.content, filename: envFile.filename };
};

export const updateGist = async (filename: string, content: string): Promise<void> => {
  const { gistId } = getAuth();
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [filename]: { content } } })
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid GitHub token. Cannot update Gist.');
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
};

export const parseEnvContent = (content: string, decrypt = true): EnvVariable[] => {
  const lines = content.split('\n');
  const variables: EnvVariable[] = [];
  let currentSection: string | undefined;
  const encryptionKey = decrypt ? getEncryptionKey() : undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      // Check if this is a section header
      if (trimmedLine.startsWith('# [') && trimmedLine.endsWith(']')) {
        currentSection = trimmedLine.substring(3, trimmedLine.length - 1);
      }
      continue;
    }

    // Parse env variable - use non-greedy match to handle values with = signs
    const match = trimmedLine.match(/^([^=]+?)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      let decryptedValue = value.trim();
      
      // Decrypt if encryption key is available and value is encrypted
      if (decrypt && encryptionKey) {
        try {
          // Only try to decrypt if value starts with ENC:
          if (decryptedValue.startsWith('ENC:')) {
            decryptedValue = decryptValue(decryptedValue, encryptionKey);
          }
        } catch (error) {
          // If decryption fails, log warning but keep encrypted value
          console.warn(`Warning: Failed to decrypt value for ${key.trim()}: ${error instanceof Error ? error.message : String(error)}`);
          // Keep original encrypted value
        }
      }
      
      variables.push({
        key: key.trim(),
        value: decryptedValue,
        section: currentSection
      });
    }
  }

  return variables;
};

export const getSectionVariables = async (sectionName: string): Promise<EnvVariable[]> => {
  const { content } = await fetchGist();
  return parseEnvContent(content).filter(v => v.section === sectionName);
};

/** Remove one section (header + all lines until next # [Section] or end). Preserves rest of content. */
export function removeSectionFromContent(content: string, sectionName: string): string {
  const sectionHeader = `# [${sectionName}]`;
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === sectionHeader) {
      i++;
      while (i < lines.length && !/^#\s*\[[^\]]*\]\s*$/.test(lines[i].trim())) {
        i++;
      }
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }
    result.push(lines[i]);
    i++;
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/**
 * Encrypts all env variable values in content if encryption key is available
 * Preserves structure (comments, sections, empty lines)
 */
export function encryptEnvContent(content: string): string {
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    return content; // No encryption key, return as-is
  }

  const lines = content.split('\n');
  const encryptedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Keep comments, empty lines, and section headers as-is
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      encryptedLines.push(line);
      continue;
    }

    // Encrypt env variable values
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const encryptedValue = encryptValue(value.trim(), encryptionKey);
      encryptedLines.push(`${key.trim()}=${encryptedValue}`);
    } else {
      // Not a valid env line, keep as-is
      encryptedLines.push(line);
    }
  }

  return encryptedLines.join('\n');
}
