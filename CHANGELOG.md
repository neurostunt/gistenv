# Changelog

All notable changes to this project will be documented in this file.

## [0.2.8] - 2026-05-16

### Fixed
- align release script with cli-commands and changelog baseline

### Documentation
- add deployment guide

- chore(deps): bump @inquirer/prompts from 8.4.2 to 8.4.3
- chore(deps-dev): bump vitest from 4.1.5 to 4.1.6
- chore(deps-dev): bump @vitest/ui from 4.1.5 to 4.1.6
- chore(deps-dev): bump @types/node from 25.6.0 to 25.7.0
- stop tracking claude.md

## [0.2.7] - 2026-04-24

### Fixed
- set upstream when pushing release branch

### Documentation
- mark #24 merged in claude.md
- note PR #24 in claude.md
- add Cursor AI acknowledgment to README

### Changed
- bump version to 0.2.6
- test release

- test: CLI + optional E2E, split entry, fix history + API env
- chore(deps-dev): bump TypeScript to 6.0.2
- chore(deps): bump vitest, @vitest/ui, inquirer, @types/node
- chore(deps-dev): bump @types/node from 25.3.0 to 25.5.0
- chore(deps-dev): bump vitest from 4.0.18 to 4.1.0
- chore(deps): bump @inquirer/prompts from 8.3.0 to 8.3.2

## [0.2.6] - 2026-03-19

### Fixed
- use IV=12 standard with full backward compat and migration script

### Documentation
- add Cursor AI acknowledgment to README

### Changed
- test release
- bump version to 0.2.5

- chore(deps-dev): bump @types/node from 25.3.0 to 25.5.0
- chore(deps-dev): bump vitest from 4.0.18 to 4.1.0
- chore(deps): bump @inquirer/prompts from 8.3.0 to 8.3.2

## [0.2.5] - 2026-02-28

### Fixed
- use IV=12 standard with full backward compat and migration script
- remove changelog regeneration from release workflow

### Changed
- npm audit fix (rollup), release workflow, bump to 0.2.4

- chore(deps-dev): bump @types/node from 25.2.3 to 25.3.0
- chore(deps): bump @inquirer/prompts from 8.2.0 to 8.3.0

## [0.2.3] - 2026-02-11

### Added
- add history command and git hooks

### Fixed
- improve release notes extraction in GitHub Actions workflow
- use action-gh-release for creating GitHub releases with notes

### Changed
- bump version to 0.2.2

- test: suppress expected warning in decryption failure test

## [0.2.2] - 2026-02-11

### Added
- add history command and git hooks

### Fixed
- use action-gh-release for creating GitHub releases with notes

### Changed
- bump version to 0.2.1

- Remove example workflows, add gitleaks config, update docs with workflow examples

## [0.2.1] - 2026-02-11

### Changed
- bump version to 0.2.0
- add changelog generation and auto-merge workflow

- Remove example workflows, add gitleaks config, update docs with workflow examples
- Add encryption support, tests, and GitHub Actions examples

## [0.2.0] - 2026-02-11

### Changed
- add changelog generation and auto-merge workflow
- bump version to 0.1.10
- exclude tags from CI/security workflows

- Add encryption support, tests, and GitHub Actions examples

