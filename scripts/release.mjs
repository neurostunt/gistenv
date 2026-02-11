#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${newVersion}`);
}

function updateCliVersion(newVersion) {
  const cliPath = path.join(rootDir, 'src', 'cli.ts');
  let content = fs.readFileSync(cliPath, 'utf8');
  content = content.replace(/\.version\(['"]\d+\.\d+\.\d+['"]\)/, `.version('${newVersion}')`);
  fs.writeFileSync(cliPath, content);
  console.log(`✓ Updated src/cli.ts to version ${newVersion}`);
}

function main() {
  const type = process.argv[2] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Error: Version type must be major, minor, or patch');
    process.exit(1);
  }

  // Read current version
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  const newVersion = incrementVersion(currentVersion, type);
  const tagName = `v${newVersion}`;

  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion}`);
  console.log(`Tag: ${tagName}\n`);

  // Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: rootDir });
    if (status.trim()) {
      console.error('Error: You have uncommitted changes. Please commit or stash them first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error: Failed to check git status');
    process.exit(1);
  }

  // Update versions
  updatePackageJson(newVersion);
  updateCliVersion(newVersion);

  // Generate changelog
  console.log('\nGenerating CHANGELOG.md...');
  execSync(`node scripts/generate-changelog.mjs ${newVersion}`, { stdio: 'inherit', cwd: rootDir });

  // Build
  console.log('\nBuilding...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

  // Commit changes
  console.log('\nCommitting changes...');
  execSync(`git add package.json src/cli.ts CHANGELOG.md`, { stdio: 'inherit', cwd: rootDir });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit', cwd: rootDir });

  // Create tag
  console.log(`\nCreating tag ${tagName}...`);
  execSync(`git tag ${tagName}`, { stdio: 'inherit', cwd: rootDir });

  // Push with tags
  console.log('\nPushing to remote...');
  execSync('git push', { stdio: 'inherit', cwd: rootDir });
  execSync('git push --tags', { stdio: 'inherit', cwd: rootDir });

  console.log(`\n✓ Release ${tagName} completed!`);
  console.log(`  GitHub Actions will automatically publish to npm.`);
}

main();
