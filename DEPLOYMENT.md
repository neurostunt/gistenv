# Deployment

`gistenv` is a Node.js CLI package. There is no Vercel hosting path for this repo; deployment means CI validation, npm publishing, and GitHub release automation.

## Overview

- CI runs on every branch push and pull request.
- Secret scanning runs on every branch push and pull request.
- Dependency audit runs on every branch push and pull request.
- Release publishing runs when a Git tag matching `v*` is pushed.

## GitHub Actions

### CI

Workflow: `.github/workflows/ci.yml`

- Runs on `push` and `pull_request`
- Tests Node.js `20`, `22`, and `24`
- Executes:
  - `npm ci`
  - `npm run build`
  - dist artifact checks for `dist/cli.js` and `dist/cli.d.ts`
  - `npm test`

### Secret Scan

Workflow: `.github/workflows/secret-scan.yml`

- Runs `gitleaks`
- Uses `.gitleaks.toml`
- Runs on `push` and `pull_request`

### Security Audit

Workflow: `.github/workflows/audit.yml`

- Runs on Node.js `24`
- Executes:
  - `npm ci`
  - `npm audit --audit-level=high`

### Release

Workflow: `.github/workflows/release.yml`

- Trigger: pushing a tag like `v0.2.8`
- Runs on Node.js `24`
- Executes:
  - `npm ci`
  - `npm run build`
  - `npm publish`
  - extracts release notes from `CHANGELOG.md`
  - creates a GitHub Release for the tag

## Required Secrets and Permissions

### GitHub-provided

- `GITHUB_TOKEN`
  - used by Actions automatically
  - used by `gitleaks`
  - used to create GitHub Releases

### npm publishing

`release.yml` publishes with npm trusted publishing via GitHub OIDC:

- workflow permission `id-token: write`
- no classic `NPM_TOKEN` is required if npm trusted publishing is configured for this repository

If trusted publishing is not configured in npm, release publishing will fail and must be set up before using tag-based releases.

## Local Release Process

The repository already includes a release script in `scripts/release.mjs`.

`package.json` exposes these existing helpers:

- `npm run release`
- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`

This document does not introduce a new release script. The commands above already call the existing `scripts/release.mjs`, which:

1. checks that the git working tree is clean
2. bumps the version in `package.json`
3. updates the CLI version string in `src/cli.ts`
4. regenerates `CHANGELOG.md`
5. runs `npm run build`
6. commits the version bump
7. creates a Git tag like `vX.Y.Z`
8. pushes the branch and tags

After that existing script pushes the tag, GitHub Actions handles npm publish and GitHub Release creation automatically.

## Recommended Release Checklist

1. Make sure local changes are committed.
2. Run `npm test`.
3. Run one of:
   - `npm run release:patch`
   - `npm run release:minor`
   - `npm run release:major`
4. Confirm the tag push triggered the `Release` workflow in GitHub Actions.
5. Verify the package was published on npm.
6. Verify the GitHub Release notes were created correctly from `CHANGELOG.md`.

## Repo Runtime Secrets

These are not GitHub Actions deployment secrets, but they are required for normal CLI usage:

- `GISTENV_GIST_ID` or `GIST_ID`
- `GISTENV_GITHUB_TOKEN` or `GITHUB_TOKEN`
- optional `GISTENV_ENCRYPTION_KEY`

Users typically store them in a local `.gistenv` file or in shell environment variables.
