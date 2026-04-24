#!/usr/bin/env node

import { program } from './cli-commands.js';
import { loadGistenvIntoProcess } from './gistenv-loader.js';

loadGistenvIntoProcess();

program.parse(process.argv);
