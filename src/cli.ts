#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fetchGist, parseEnvContent } from './gist';
import { writeEnvFile } from './env';
import path from 'path';
import fs from 'fs';

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
          console.log(chalk.yellowBright('No sections found in your Gist.'));
          return;
        }
        console.log(chalk.whiteBright('\nAvailable sections:'));
        sectionNames.forEach(s => console.log(chalk.cyanBright('- ' + s)));
      } catch (error) {
        console.error(chalk.redBright(`Error: ${error instanceof Error ? error.message : String(error)}`));
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
          console.log(chalk.yellowBright('No sections found in your Gist.'));
          return;
        }
        const { selectedSection, mode, outputFile } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedSection',
            message: chalk.whiteBright('Select section to copy:'),
            choices: sectionNames
          },
          {
            type: 'list',
            name: 'mode',
            message: chalk.whiteBright('How to add variables:'),
            choices: [
              { name: 'Append to existing .env file', value: 'append' },
              { name: 'Replace existing .env file', value: 'replace' }
            ]
          },
          {
            type: 'input',
            name: 'outputFile',
            message: chalk.whiteBright('Output file:'),
            default: '.env'
          }
        ]);
        const sectionVariables = allVariables.filter(v => v.section === selectedSection);
        if (sectionVariables.length === 0) {
          console.log(chalk.yellowBright(`No variables found in section "${selectedSection}"`));
          return;
        }
        writeEnvFile(sectionVariables, outputFile, mode);
        console.log(chalk.greenBright(`✓ Variables from section "${selectedSection}" copied to ${outputFile}!`));
      } catch (error) {
        console.error(chalk.redBright(`Error: ${error instanceof Error ? error.message : String(error)}`));
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
          console.log(chalk.yellowBright('No keys found in your Gist.'));
          return;
        }
        console.log(chalk.whiteBright('\nAvailable keys:'));
        keys.forEach(k => console.log(chalk.greenBright('- ' + k)));
      } catch (error) {
        console.error(chalk.redBright(`Error: ${error instanceof Error ? error.message : String(error)}`));
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
          console.log(chalk.yellowBright('No keys found in your Gist.'));
          return;
        }
        const { selectedKeys, mode, outputFile } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedKeys',
            message: chalk.whiteBright('Select keys to copy:'),
            choices: keys,
            validate: (input: string[]) => input.length > 0 ? true : 'Select at least one key'
          },
          {
            type: 'list',
            name: 'mode',
            message: chalk.whiteBright('How to add variables:'),
            choices: [
              { name: 'Append to existing .env file', value: 'append' },
              { name: 'Replace existing .env file', value: 'replace' }
            ]
          },
          {
            type: 'input',
            name: 'outputFile',
            message: chalk.whiteBright('Output file:'),
            default: '.env'
          }
        ]);
        const selectedVariables = allVariables.filter(v => selectedKeys.includes(v.key));
        writeEnvFile(selectedVariables, outputFile, mode);
        console.log(chalk.greenBright(`✓ Selected keys copied to ${outputFile}!`));
      } catch (error) {
        console.error(chalk.redBright(`Error: ${error instanceof Error ? error.message : String(error)}`));
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
        console.log(chalk.whiteBright('\nAvailable environment variables:'));
        let currentSection: string | undefined;
        variables.forEach(v => {
          if (v.section !== currentSection) {
            currentSection = v.section;
            console.log(chalk.cyanBright(`\n[${currentSection || 'No Section'}]`));
          }
          console.log(`${chalk.greenBright(v.key)} = ${chalk.whiteBright(v.value)}`);
        });
      } catch (error) {
        console.error(chalk.redBright(`Error: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

program.showHelpAfterError();
program.addHelpCommand();
program.parse(process.argv);
