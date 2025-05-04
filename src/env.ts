import fs from 'fs';
import path from 'path';

// Inline EnvVariable type
type EnvVariable = {
  key: string;
  value: string;
  section?: string;
};

export const loadEnvFile = (filePath = '.env'): Record<string, string> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
};

export const writeEnvFile = (
  variables: EnvVariable[],
  filePath = '.env',
  mode: 'append' | 'replace' = 'append'
): void => {
  const absolutePath = path.resolve(process.cwd(), filePath);

  let existingContent = '';
  let existingVars: Record<string, string> = {};

  if (fs.existsSync(absolutePath) && mode === 'append') {
    existingContent = fs.readFileSync(absolutePath, 'utf8');
    existingVars = loadEnvFile(absolutePath);
  }

  // Create a new content
  let newContent = '';

  if (mode === 'append' && existingContent) {
    // Start with existing content
    newContent = existingContent;

    // Add a newline if there isn't one at the end
    if (!newContent.endsWith('\n')) {
      newContent += '\n';
    }

    // Add a separator
    newContent += '\n# --- Added by gistenv ---\n';
  }

  // Add all new variables
  for (const variable of variables) {
    if (mode === 'append' && variable.key in existingVars) {
      // Skip if it already exists and we're in append mode
      continue;
    }

    // Add a section comment if needed
    if (variable.section && (!variables[variables.indexOf(variable) - 1] ||
        variables[variables.indexOf(variable) - 1].section !== variable.section)) {
      newContent += `\n# [${variable.section}]\n`;
    }

    newContent += `${variable.key}=${variable.value}\n`;
  }

  // Write to the file
  fs.writeFileSync(absolutePath, newContent);
};
