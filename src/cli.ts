#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Minimal .env loader for .gistenv (cwd, then HOME; or GISTENV_FILE path)
function loadDotEnvFile() {
  const explicit = process.env.GISTENV_FILE;
  const localEnvPath = path.resolve(process.cwd(), '.gistenv');
  const homeEnvPath = path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.gistenv');
  let envPath = '';
  if (explicit && fs.existsSync(path.resolve(process.cwd(), explicit))) {
    envPath = path.resolve(process.cwd(), explicit);
  } else if (explicit && fs.existsSync(explicit)) {
    envPath = explicit;
  } else if (fs.existsSync(localEnvPath)) {
    envPath = localEnvPath;
  } else if (fs.existsSync(homeEnvPath)) {
    envPath = homeEnvPath;
  }
  if (envPath) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
loadDotEnvFile();

// Minimal color helper
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  cyanBright: "\x1b[96m",
  greenBright: "\x1b[92m",
  yellowBright: "\x1b[93m",
  redBright: "\x1b[91m",
  whiteBright: "\x1b[97m",
  bold: "\x1b[1m"
};
function color(text: string, code: string) {
  return code + text + colors.reset;
}

import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import { fetchGist, updateGist, parseEnvContent, removeSectionFromContent, encryptEnvContent } from './gist';
import { writeEnvFile } from './env';
import { isEncryptionAvailable } from './crypto';

const program = new Command();

const DEFAULT_UPLOAD_FILE = '.env';

program
  .name('gistenv')
  .description('Upload .env to Gist as a section, or download a section into .env')
  .version('0.1.10');

defineSectionsCommand();
defineListCommand();
defineDownloadCommand();
defineUploadCommand();
defineDeleteCommand();
defineEncryptCommand();

function defineSectionsCommand() {
  program
    .command('sections')
    .description('List all sections in the Gist')
    .action(async () => {
      try {
        const { content } = await fetchGist();
        const allVariables = parseEnvContent(content);
        const sectionNames = Array.from(new Set(allVariables.map(v => v.section).filter(Boolean))) as string[];
        if (sectionNames.length === 0) {
          console.log(color('No sections found in your Gist.', colors.yellowBright));
          return;
        }
        console.log(color('\nAvailable sections:', colors.whiteBright));
        sectionNames.forEach(s => console.log(color('- ' + s, colors.cyanBright)));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineListCommand() {
  program
    .command('list')
    .description('List all variables in the Gist, grouped by section')
    .action(async () => {
      try {
        const { content } = await fetchGist();
        const variables = parseEnvContent(content);
        console.log(color('\nAvailable environment variables:', colors.whiteBright));
        let currentSection: string | undefined;
        variables.forEach(v => {
          if (v.section !== currentSection) {
            currentSection = v.section;
            console.log(color(`\n[${currentSection || 'No Section'}]`, colors.cyanBright));
          }
          console.log(color(v.key, colors.greenBright) + ' = ' + color(v.value, colors.whiteBright));
        });
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineDownloadCommand() {
  program
    .command('download')
    .description('Download a section from the Gist into a .env file')
    .option('-o, --output <file>', 'Output file', '.env')
    .option('-s, --section <name>', 'Section name (non-interactive mode, for CI/CD)')
    .option('-m, --mode <mode>', 'Write mode: append or replace', 'replace')
    .option('-v, --verbose', 'Show verbose output including decryption warnings')
    .action(async function() {
      try {
        const opts = this.opts();
        const { content } = await fetchGist();
        const allVariables = parseEnvContent(content);
        const sectionNames = Array.from(new Set(allVariables.map(v => v.section).filter(Boolean))) as string[];
        if (sectionNames.length === 0) {
          console.log(color('No sections found in your Gist.', colors.yellowBright));
          return;
        }
        
        let selectedSection: string;
        let mode: 'append' | 'replace';
        
        // Non-interactive mode (for CI/CD)
        if (opts.section) {
          selectedSection = opts.section as string;
          if (!sectionNames.includes(selectedSection)) {
            console.error(color(`Error: Section "${selectedSection}" not found. Available sections: ${sectionNames.join(', ')}`, colors.redBright));
            return;
          }
          mode = (opts.mode === 'append' || opts.mode === 'replace') ? opts.mode : 'replace';
        } else {
          // Interactive mode
          selectedSection = await select({
            message: 'Select section to download:',
            choices: sectionNames.map(name => ({ value: name, name }))
          });
          mode = await select({
            message: 'Write to .env:',
            choices: [
              { value: 'append', name: 'Append to existing .env' },
              { value: 'replace', name: 'Replace .env' }
            ]
          }) as 'append' | 'replace';
        }
        
        if (!selectedSection) {
          console.error(color('Error: No section selected', colors.redBright));
          return;
        }
        const sectionVariables = allVariables.filter(v => v.section === selectedSection);
        
        if (sectionVariables.length === 0) {
          console.error(color(`Error: No variables found in section "${selectedSection}"`, colors.redBright));
          console.log(color(`Available sections: ${sectionNames.join(', ')}`, colors.yellowBright));
          console.log(color(`Total variables found: ${allVariables.length}`, colors.yellowBright));
          return;
        }
        
        if (opts.verbose) {
          console.log(color(`Found ${sectionVariables.length} variables in section "${selectedSection}"`, colors.cyanBright));
          sectionVariables.forEach(v => {
            const isEncrypted = v.value.startsWith('ENC:');
            console.log(color(`  ${v.key} = ${isEncrypted ? '[ENCRYPTED]' : v.value}`, isEncrypted ? colors.yellowBright : colors.whiteBright));
          });
        }
        
        const outputFile = (opts.output as string | undefined) ?? '.env';
        writeEnvFile(sectionVariables, outputFile, mode);
        console.log(color(`✓ Section "${selectedSection}" written to ${outputFile}`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineUploadCommand() {
  program
    .command('upload')
    .description('Upload .env to the Gist as a new section')
    .argument('[file]', 'Path to env file (default: .env)')
    .action(async (fileArg?: string) => {
      try {
        const cwd = process.cwd();
        const filePath = fileArg
          ? path.resolve(cwd, fileArg)
          : path.resolve(cwd, DEFAULT_UPLOAD_FILE);
        if (!fs.existsSync(filePath)) {
          console.error(color(`File not found: ${filePath}`, colors.redBright));
          return;
        }
        let fileContent = fs.readFileSync(filePath, 'utf-8').trim();
        
        // Encrypt content if encryption key is available
        if (isEncryptionAvailable()) {
          fileContent = encryptEnvContent(fileContent);
          console.log(color('ℹ Values will be encrypted before upload', colors.cyanBright));
        }
        
        const defaultSection = path.basename(filePath).replace(/^\.env-?/, '') || 'Example';
        const sectionName = await input({
          message: color('Section name (e.g. Production, Staging):', colors.whiteBright),
          default: defaultSection
        });
        const { content, filename } = await fetchGist();
        const newContent = content.trimEnd() + '\n\n# [' + sectionName + ']\n' + fileContent + '\n';
        await updateGist(filename, newContent);
        console.log(color(`✓ Section "${sectionName}" added to Gist`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineDeleteCommand() {
  program
    .command('delete')
    .description('Delete a section from the Gist')
    .action(async () => {
      try {
        const { content, filename } = await fetchGist();
        const allVariables = parseEnvContent(content);
        const sectionNames = Array.from(new Set(allVariables.map(v => v.section).filter(Boolean))) as string[];
        if (sectionNames.length === 0) {
          console.log(color('No sections found in your Gist.', colors.yellowBright));
          return;
        }
        const selectedSection = await select({
          message: 'Select section to delete:',
          choices: sectionNames.map(name => ({ value: name, name }))
        });
        const newContent = removeSectionFromContent(content, selectedSection);
        await updateGist(filename, newContent);
        console.log(color(`✓ Section "${selectedSection}" deleted from Gist`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineEncryptCommand() {
  program
    .command('encrypt')
    .description('Encrypt all values in a file or the entire Gist (requires GISTENV_ENCRYPTION_KEY)')
    .argument('[file]', 'Path to env file to encrypt (if omitted, encrypts entire Gist)')
    .option('-o, --output <file>', 'Output file (only when encrypting a local file)')
    .action(async (fileArg?: string, opts?: { output?: string }) => {
      try {
        if (!isEncryptionAvailable()) {
          console.error(color('Error: GISTENV_ENCRYPTION_KEY not set or too short (min 16 chars)', colors.redBright));
          console.error(color('Add GISTENV_ENCRYPTION_KEY to your .gistenv file', colors.yellowBright));
          return;
        }

        // If file is provided, encrypt local file
        if (fileArg) {
          const cwd = process.cwd();
          const filePath = path.resolve(cwd, fileArg);
          
          if (!fs.existsSync(filePath)) {
            console.error(color(`File not found: ${filePath}`, colors.redBright));
            return;
          }

          const content = fs.readFileSync(filePath, 'utf-8');
          const encryptedContent = encryptEnvContent(content);
          
          if (encryptedContent === content) {
            console.log(color('All values are already encrypted or no values to encrypt.', colors.yellowBright));
            return;
          }

          const outputFile = opts?.output || filePath;
          fs.writeFileSync(outputFile, encryptedContent);
          console.log(color(`✓ File encrypted and saved to ${outputFile}`, colors.greenBright));
          return;
        }

        // Otherwise, encrypt entire Gist
        console.log(color('Fetching Gist content...', colors.cyanBright));
        const { content, filename } = await fetchGist();
        
        // Parse content without decryption to preserve structure
        const variables = parseEnvContent(content, false);
        
        if (variables.length === 0) {
          console.log(color('No variables found in Gist.', colors.yellowBright));
          return;
        }

        console.log(color(`Found ${variables.length} variables. Encrypting...`, colors.cyanBright));
        
        // Encrypt the entire content
        const encryptedContent = encryptEnvContent(content);
        
        // Check if anything changed
        if (encryptedContent === content) {
          console.log(color('All values are already encrypted or no values to encrypt.', colors.yellowBright));
          return;
        }

        // Update Gist with encrypted content
        await updateGist(filename, encryptedContent);
        console.log(color('✓ All values encrypted and Gist updated', colors.greenBright));
        console.log(color('ℹ Values are now encrypted. Use download to decrypt automatically.', colors.cyanBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

program.showHelpAfterError();
program.addHelpCommand();
program.parse(process.argv);
