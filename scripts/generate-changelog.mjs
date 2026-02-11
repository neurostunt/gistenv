#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getLatestTag() {
  try {
    const tags = execSync('git tag --sort=-v:refname', { encoding: 'utf8', cwd: rootDir })
      .trim()
      .split('\n')
      .filter(t => t.startsWith('v'));
    return tags.length > 1 ? tags[1] : null; // Second tag (previous one)
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const commits = execSync(`git log ${range} --pretty=format:"%s" --no-merges`, {
      encoding: 'utf8',
      cwd: rootDir
    }).trim();
    return commits ? commits.split('\n') : [];
  } catch {
    return [];
  }
}

function categorizeCommits(commits) {
  const categories = {
    feat: [],
    fix: [],
    chore: [],
    docs: [],
    other: []
  };

  commits.forEach(commit => {
    const lower = commit.toLowerCase();
    if (lower.startsWith('feat:') || lower.startsWith('feature:')) {
      categories.feat.push(commit);
    } else if (lower.startsWith('fix:') || lower.startsWith('bugfix:')) {
      categories.fix.push(commit);
    } else if (lower.startsWith('chore:')) {
      categories.chore.push(commit);
    } else if (lower.startsWith('docs:') || lower.startsWith('doc:')) {
      categories.docs.push(commit);
    } else {
      categories.other.push(commit);
    }
  });

  return categories;
}

function generateChangelog(newVersion, previousTag) {
  const commits = getCommitsSinceTag(previousTag);
  const categories = categorizeCommits(commits);

  if (commits.length === 0) {
    return `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\n- No changes\n`;
  }

  let changelog = `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\n`;

  if (categories.feat.length > 0) {
    changelog += '### Added\n';
    categories.feat.forEach(commit => {
      changelog += `- ${commit.replace(/^(feat|feature):\s*/i, '')}\n`;
    });
    changelog += '\n';
  }

  if (categories.fix.length > 0) {
    changelog += '### Fixed\n';
    categories.fix.forEach(commit => {
      changelog += `- ${commit.replace(/^(fix|bugfix):\s*/i, '')}\n`;
    });
    changelog += '\n';
  }

  if (categories.docs.length > 0) {
    changelog += '### Documentation\n';
    categories.docs.forEach(commit => {
      changelog += `- ${commit.replace(/^(docs?):\s*/i, '')}\n`;
    });
    changelog += '\n';
  }

  if (categories.chore.length > 0) {
    changelog += '### Changed\n';
    categories.chore.forEach(commit => {
      changelog += `- ${commit.replace(/^chore:\s*/i, '')}\n`;
    });
    changelog += '\n';
  }

  if (categories.other.length > 0) {
    categories.other.forEach(commit => {
      changelog += `- ${commit}\n`;
    });
    changelog += '\n';
  }

  return changelog;
}

function main() {
  let newVersion = process.argv[2] || '0.0.0';
  // Remove 'v' prefix if present
  if (newVersion.startsWith('v')) {
    newVersion = newVersion.slice(1);
  }
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');

  // Get previous tag
  const previousTag = getLatestTag();
  console.log(`Previous tag: ${previousTag || 'none'}`);

  // Generate new changelog entry
  const newEntry = generateChangelog(newVersion, previousTag);

  // Read existing changelog or create new one
  let existingContent = '';
  if (fs.existsSync(changelogPath)) {
    existingContent = fs.readFileSync(changelogPath, 'utf8');
  } else {
    existingContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }

  // Insert new entry after the header
  const headerEnd = existingContent.indexOf('##');
  if (headerEnd === -1) {
    // No existing entries, append to header
    const updatedContent = existingContent + newEntry;
    fs.writeFileSync(changelogPath, updatedContent);
  } else {
    // Insert after header, before first entry
    const updatedContent = existingContent.slice(0, headerEnd) + newEntry + existingContent.slice(headerEnd);
    fs.writeFileSync(changelogPath, updatedContent);
  }

  console.log(`✓ Generated CHANGELOG.md for version ${newVersion}`);
}

main();
