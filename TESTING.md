# Testing GistEnv

## Prerequisites

1. Build: `npm run build`
2. Link: `npm link`

## Setup

1. Create a GitHub Gist with a file named `.env`, e.g. content from `example-gist.env`. Use "Secret" for private vars.
2. Note the Gist ID from the URL (e.g. `https://gist.github.com/user/abc123` → `abc123`).
3. Create `.gistenv` in project root or home:

   ```
   GISTENV_GIST_ID=your_gist_id
   GISTENV_GITHUB_TOKEN=your_token
   ```

   Token needs **gist** scope (read + write for upload).

## Commands to test

- **sections** — `gistenv sections`
- **list** — `gistenv list`
- **download** — `gistenv download` (pick section, append/replace, writes to `.env`)
- **upload** — add `.env-example` or `.env.example` in project, then `gistenv upload` (prompt section name); or `gistenv upload path/to/file`
- **encrypt** — `gistenv encrypt` (encrypts entire Gist) or `gistenv encrypt <file>` (encrypts local file)
- **delete** — `gistenv delete` (pick section to remove)

## Verify

After download: `cat .env`. After upload: open the Gist in the browser and confirm the new `# [SectionName]` block.

## Automated E2E (optional, manual)

Live calls to the GitHub API and the built CLI (`dist/cli.js`). Not part of the default `npm test` run.

1. Build: `npm run build`
2. Set `GISTENV_E2E=1`. Provide credentials the same way as for the CLI: a `.gistenv` in the project or home, **or** `GISTENV_GIST_ID` / `GIST_ID` and `GISTENV_GITHUB_TOKEN` / `GITHUB_TOKEN` in the environment. The E2E file loads `.gistenv` so it matches the CLI. Use the real Gist id and token — do not use the Unicode `…` character as a placeholder (that breaks Node’s `fetch` headers; real ids/tokens are ASCII).
3. The Gist should include at least one `# [SectionName]` block so the `download` check can run.
4. Run: `GISTENV_E2E=1 npm run test:e2e`

This executes `tests/e2e/gistenv-api.e2e.test.ts` only (see `vitest.e2e.config.ts`).
