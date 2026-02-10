# GistEnv

Upload your project’s `.env-example` to a GitHub Gist as a section, and download any section into a local `.env` file. Sections use the format `# [Production]`, `# [Staging]`, etc.

## Setup (all you need)

**1. Create a GitHub Gist** with a file named `.env` (or `*.env`), e.g.:

```env
# [Development]
API_URL=https://dev.example.com
DEBUG=true
```

**2. Add a `.gistenv` file** in your project root or home directory:

```
GISTENV_GIST_ID=your_gist_id_here
GISTENV_GITHUB_TOKEN=your_token_here
```

Use a **private** Gist and a token with **gist** scope. Never commit `.gistenv` or `.env`.

**That’s it.** No install — run with **npx** (see Commands below).

## Commands

### Upload — add project env as a section

From your project directory, upload `.env-example` or `.env.example` (or any file you pass) as a **new section** in the Gist:

```bash
npx gistenv upload
# or
npx gistenv upload path/to/.env-example
```

You’ll be prompted for the section name (e.g. `Production`, `Staging`). The file is appended to the Gist under `# [SectionName]`.

### Download — write a section to .env

Download a section from the Gist into your local `.env`:

```bash
npx gistenv download
```

Choose the section, then choose append or replace. Use `-o` to write to another file:

```bash
npx gistenv download -o .env.local
```

### List sections and variables

```bash
npx gistenv sections   # section names only
npx gistenv list       # all variables grouped by section
```

## Workflow

1. In the project: keep a `.env-example` (or `.env.example`) with variable names and placeholders.
2. Run `npx gistenv upload` to add it to your Gist as a section (e.g. “Production” or “Staging”).
3. On another machine or repo: add `.gistenv` and run `npx gistenv download` to pull a section into `.env`.

## Security

- Store the GitHub token in `.gistenv` only; don’t commit it.
- Use a **private** Gist for real secrets.
- Don’t commit `.env` or `.gistenv`.

## Development (testing before npm publish)

```bash
git clone … && cd gistenv && npm install && npm run build
npx . download
# or: npm run gistenv -- download
```

## License

MIT
