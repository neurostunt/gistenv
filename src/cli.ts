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
import inquirer from 'inquirer';
import { fetchGist, updateGist, parseEnvContent } from './gist';
import { writeEnvFile } from './env';

const program = new Command();

const EXAMPLE_FILES = ['.env-example', '.env.example'];

program
  .name('gistenv')
  .description('Upload project .env-example to Gist as a section, or download a section into .env')
  .version('0.1.0');

defineSectionsCommand();
defineListCommand();
defineDownloadCommand();
defineUploadCommand();

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
    .action(async (opts: { output?: string }) => {
      try {
        const { content } = await fetchGist();
        const allVariables = parseEnvContent(content);
        const sectionNames = Array.from(new Set(allVariables.map(v => v.section).filter(Boolean))) as string[];
        if (sectionNames.length === 0) {
          console.log(color('No sections found in your Gist.', colors.yellowBright));
          return;
        }
        const { selectedSection, mode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedSection',
            message: color('Select section to download:', colors.whiteBright),
            choices: sectionNames
          },
          {
            type: 'list',
            name: 'mode',
            message: color('Write to .env:', colors.whiteBright),
            choices: [
              { name: 'Append to existing .env', value: 'append' },
              { name: 'Replace .env', value: 'replace' }
            ]
          }
        ]);
        const sectionVariables = allVariables.filter(v => v.section === selectedSection);
        const outputFile = opts.output ?? '.env';
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
    .description('Upload a project .env-example (or similar) to the Gist as a new section')
    .argument('[file]', 'Path to env file (default: .env-example or .env.example)')
    .action(async (fileArg?: string) => {
      try {
        const cwd = process.cwd();
        let filePath = fileArg;
        if (!filePath) {
          const found = EXAMPLE_FILES.find(f => fs.existsSync(path.resolve(cwd, f)));
          if (!found) {
            console.error(color(`No file found. Create .env-example or .env.example, or pass a path.`, colors.redBright));
            return;
          }
          filePath = path.resolve(cwd, found);
        } else {
          filePath = path.resolve(cwd, filePath);
        }
        if (!fs.existsSync(filePath)) {
          console.error(color(`File not found: ${filePath}`, colors.redBright));
          return;
        }
        const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
        const defaultSection = path.basename(filePath).replace(/^\.env-?/, '') || 'Example';
        const { sectionName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'sectionName',
            message: color('Section name (e.g. Production, Staging):', colors.whiteBright),
            default: defaultSection
          }
        ]);
        const { content, filename } = await fetchGist();
        const newContent = content.trimEnd() + '\n\n# [' + sectionName + ']\n' + fileContent + '\n';
        await updateGist(filename, newContent);
        console.log(color(`✓ Section "${sectionName}" added to Gist`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

program.showHelpAfterError();
program.addHelpCommand();
program.parse(process.argv);
