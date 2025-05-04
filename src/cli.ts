#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Minimal .env loader for .gistenv
function loadDotEnvFile() {
  const localEnvPath = path.resolve(process.cwd(), '.gistenv');
  const homeEnvPath = path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.gistenv');
  let envPath = '';
  if (fs.existsSync(localEnvPath)) {
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
import { fetchGist, parseEnvContent } from './gist';
import { writeEnvFile } from './env';

const program = new Command();

program
  .name('gistenv')
  .description('CLI tool to copy environment variables from GitHub Gists to local .env files')
  .version('0.1.0');

// List all available sections in the Gist
defineSectionsCommand();
// Copy a section to .env
defineCopySectionCommand();
// List all available keys in the Gist
defineKeysCommand();
// Copy selected keys to .env
defineCopyKeysCommand();
// List all variables grouped by section
defineListCommand();

function defineSectionsCommand() {
  program
    .command('sections')
    .description('List all available sections in the Gist')
    .action(async () => {
      try {
        const gistContent = await fetchGist();
        const allVariables = parseEnvContent(gistContent);
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

function defineCopySectionCommand() {
  program
    .command('copy-section')
    .description('Copy all variables from a section to .env')
    .action(async () => {
      try {
        const gistContent = await fetchGist();
        const allVariables = parseEnvContent(gistContent);
        const sectionNames = Array.from(new Set(allVariables.map(v => v.section).filter(Boolean))) as string[];
        if (sectionNames.length === 0) {
          console.log(color('No sections found in your Gist.', colors.yellowBright));
          return;
        }
        const { selectedSection, mode, outputFile } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedSection',
            message: color('Select section to copy:', colors.whiteBright),
            choices: sectionNames
          },
          {
            type: 'list',
            name: 'mode',
            message: color('How to add variables:', colors.whiteBright),
            choices: [
              { name: 'Append to existing .env file', value: 'append' },
              { name: 'Replace existing .env file', value: 'replace' }
            ]
          },
          {
            type: 'input',
            name: 'outputFile',
            message: color('Output file:', colors.whiteBright),
            default: '.env'
          }
        ]);
        const sectionVariables = allVariables.filter(v => v.section === selectedSection);
        if (sectionVariables.length === 0) {
          console.log(color(`No variables found in section "${selectedSection}"`, colors.yellowBright));
          return;
        }
        writeEnvFile(sectionVariables, outputFile, mode);
        console.log(color(`✓ Variables from section "${selectedSection}" copied to ${outputFile}!`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineKeysCommand() {
  program
    .command('keys')
    .description('List all available keys in the Gist')
    .action(async () => {
      try {
        const gistContent = await fetchGist();
        const allVariables = parseEnvContent(gistContent);
        const keys = Array.from(new Set(allVariables.map(v => v.key)));
        if (keys.length === 0) {
          console.log(color('No keys found in your Gist.', colors.yellowBright));
          return;
        }
        console.log(color('\nAvailable keys:', colors.whiteBright));
        keys.forEach(k => console.log(color('- ' + k, colors.greenBright)));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineCopyKeysCommand() {
  program
    .command('copy-keys')
    .description('Copy selected keys from the Gist to .env')
    .action(async () => {
      try {
        const gistContent = await fetchGist();
        const allVariables = parseEnvContent(gistContent);
        const keys = Array.from(new Set(allVariables.map(v => v.key)));
        if (keys.length === 0) {
          console.log(color('No keys found in your Gist.', colors.yellowBright));
          return;
        }
        const { selectedKeys, mode, outputFile } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedKeys',
            message: color('Select keys to copy:', colors.whiteBright),
            choices: keys,
            validate: (input: string[]) => input.length > 0 ? true : 'Select at least one key'
          },
          {
            type: 'list',
            name: 'mode',
            message: color('How to add variables:', colors.whiteBright),
            choices: [
              { name: 'Append to existing .env file', value: 'append' },
              { name: 'Replace existing .env file', value: 'replace' }
            ]
          },
          {
            type: 'input',
            name: 'outputFile',
            message: color('Output file:', colors.whiteBright),
            default: '.env'
          }
        ]);
        const selectedVariables = allVariables.filter(v => selectedKeys.includes(v.key));
        writeEnvFile(selectedVariables, outputFile, mode);
        console.log(color(`✓ Selected keys copied to ${outputFile}!`, colors.greenBright));
      } catch (error) {
        console.error(color(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.redBright));
      }
    });
}

function defineListCommand() {
  program
    .command('list')
    .description('List all available variables in the Gist, grouped by section')
    .action(async () => {
      try {
        const gistContent = await fetchGist();
        const variables = parseEnvContent(gistContent);
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

program.showHelpAfterError();
program.addHelpCommand();
program.parse(process.argv);
