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

## Verify

After download: `cat .env`. After upload: open the Gist in the browser and confirm the new `# [SectionName]` block.
