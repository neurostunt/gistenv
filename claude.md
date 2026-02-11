# GistEnv — Agent context

Use this file for project context and architectural decisions. Update it after significant changes so Cursor and Claude CLI stay in sync.

## What this is

**gistenv** — CLI to sync env vars with a single GitHub Gist. **Upload**: project `.env-example` (or `.env.example`) → new section in Gist. **Download**: one section from Gist → local `.env`. Sections are `# [Name]` blocks.

- **Stack:** Node.js, TypeScript (ES2020, NodeNext), Commander, Inquirer.
- **Entry:** `src/cli.ts` (bin: `gistenv` → `dist/cli.js`).

## Layout

| Path | Role |
|------|------|
| `src/cli.ts` | Loads `.gistenv` first; commands: `sections`, `list`, `download`, `upload`. |
| `src/gist.ts` | `fetchGist()` → `{ content, filename }`; `updateGist(filename, content)` (PATCH); `parseEnvContent()` for `# [Section]` + KEY=VALUE; `encryptEnvContent()` for encryption. |
| `src/env.ts` | `loadEnvFile()`, `writeEnvFile(vars, path, 'append'|'replace')`. |
| `src/crypto.ts` | `encryptValue()`, `decryptValue()` using AES-256-GCM; `getEncryptionKey()`, `isEncryptionAvailable()`. |

## Config & env

- **Auth:** `.gistenv` in cwd or HOME (cwd wins). `GISTENV_GIST_ID` or `GIST_ID`, `GISTENV_GITHUB_TOKEN` or `GITHUB_TOKEN`. Never committed.
- **Encryption:** Optional `GISTENV_ENCRYPTION_KEY` (min 16 chars). If set, values encrypted with AES-256-GCM before upload, auto-decrypted on download. Backward compatible.
- **Gist:** One file named `.env` or `*.env`. Sections: `# [SectionName]` then KEY=VALUE lines. Encrypted values prefixed with `ENC:`.
- **Upload input:** Default file: `.env`; or pass path (e.g. `upload .env.example`). Section name prompted (default from filename).

## Commands

- `sections` — list section names in Gist.
- `list` — all vars grouped by section.
- `download` — pick section → append/replace → write to `.env` (or `-o <file>`). Flags: `--section <name>` (non-interactive, for CI/CD), `--mode <append|replace>`.
- `upload [file]` — read file (default .env), prompt section name, append `# [Name]` + content to Gist via PATCH.
- `delete` — pick section → remove that section (header + vars) from Gist via PATCH; rest of content unchanged.
- `encrypt` — encrypt all values in existing Gist (requires GISTENV_ENCRYPTION_KEY). Parses content, encrypts unencrypted values, updates entire Gist.

## Conventions

- No .env lib; minimal line-by-line parsing. Errors thrown in gist/env; CLI catches and prints in red.
- `EnvVariable` { key, value, section? } in gist + env.

## Run / build

```bash
npm run build    # tsc → dist/
npm run watch    # tsc -w
npm start        # node dist/cli.js
npm link         # then: gistenv <command>
```

## Current progress

- [x] Simplified to upload (file → section) + download (section → .env); sections + list.
- [x] Example file convention: .env-example, .env.example.
- [x] Encryption support: AES-256-GCM encryption for values if `GISTENV_ENCRYPTION_KEY` is set. Auto-encrypt on upload, auto-decrypt on download. Backward compatible.
- [x] CI/CD support: `--section` and `--mode` flags for non-interactive download in GitHub Actions.
- [x] Multi-project support: Sections can be project-based (`"MyApp Production"`, `"WeatherApp Staging"`) or environment-based (`production`, `staging`). Project-based recommended for multiple projects/sites in one Gist.
- [x] GitHub Actions guide: `GITHUB_ACTIONS_GUIDE.md` with examples for multiple environments.
- Use README.md for user docs, TESTING.md for manual testing.
