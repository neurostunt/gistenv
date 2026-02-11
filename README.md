# GistEnv

Sync env vars with a GitHub Gist: upload `.env` as a section, download a section to `.env`. No install — use **npx**.

**Repo:** [github.com/neurostunt/gistenv](https://github.com/neurostunt/gistenv)

## Setup

1. **Create a Gist** with a file named `.env` (or `*.env`). Use section headers: `# [Production]`, `# [Staging]`, etc.

2. **Add `.gistenv`** in your project or home dir:

```
GISTENV_GIST_ID=your_gist_id
GISTENV_GITHUB_TOKEN=your_token
```

Token needs **gist** scope. Use a private Gist for secrets. Don’t commit `.gistenv` or `.env`.

## Commands

```bash
npx gistenv upload      # add .env as new section (or: upload <path> for another file)
npx gistenv download    # pick section → write to .env
npx gistenv delete      # pick section → remove it from Gist
npx gistenv sections    # list sections
npx gistenv list        # list all vars by section
```

Download: `npx gistenv download -o .env.local` to write to another file.

## License

MIT
