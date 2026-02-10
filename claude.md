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
| `src/gist.ts` | `fetchGist()` → `{ content, filename }`; `updateGist(filename, content)` (PATCH); `parseEnvContent()` for `# [Section]` + KEY=VALUE. |
| `src/env.ts` | `loadEnvFile()`, `writeEnvFile(vars, path, 'append'|'replace')`. |

## Config & env

- **Auth:** `.gistenv` in cwd or HOME (cwd wins). `GISTENV_GIST_ID` or `GIST_ID`, `GISTENV_GITHUB_TOKEN` or `GITHUB_TOKEN`. Never committed.
- **Gist:** One file named `.env` or `*.env`. Sections: `# [SectionName]` then KEY=VALUE lines.
- **Upload input:** Default files: `.env-example`, `.env.example` (in that order); or pass path. Section name prompted (default from filename).

## Commands

- `sections` — list section names in Gist.
- `list` — all vars grouped by section.
- `download` — pick section → append/replace → write to `.env` (or `-o <file>`).
- `upload [file]` — read file (default .env-example/.env.example), prompt section name, append `# [Name]` + content to Gist via PATCH.

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
- Use README.md for user docs, TESTING.md for manual testing.
