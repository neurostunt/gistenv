# GistEnv

    Sync env vars with a GitHub Gist: upload `.env` as a section, download a section to `.env`. No install — use **npx**.

**Repo:** [github.com/neurostunt/gistenv](https://github.com/neurostunt/gistenv)

## Setup

1. **Create a Gist** with a file named `.env` (or `*.env`). Use section headers: `# [ProjectName Production]`, `# [ProjectName Staging]`, etc.
   
   **Example Gist structure:**
   ```
   # [MyApp Production]
   WEATHER_API_KEY=prod_key_123
   MAP_API_KEY=map_key_456
   
   # [MyApp Staging]
   WEATHER_API_KEY=staging_key_123
   MAP_API_KEY=map_key_456
   ```

2. **Add `.gistenv`** in your project or home dir:

```
GISTENV_GIST_ID=your_gist_id
GISTENV_GITHUB_TOKEN=your_token
GISTENV_ENCRYPTION_KEY=your_encryption_key  # Optional: encrypt values (min 16 chars)
```

Token needs **gist** scope. Use a private Gist for secrets. Don't commit `.gistenv` or `.env`.

**Encryption:** If `GISTENV_ENCRYPTION_KEY` is set (min 16 characters), all values are automatically encrypted before upload and decrypted on download. Uses AES-256-GCM. Backward compatible with unencrypted data.

## Commands

```bash
npx gistenv upload      # add .env as new section (or: upload <path> for another file)
npx gistenv download    # pick section → write to .env
npx gistenv delete      # pick section → remove it from Gist
npx gistenv encrypt     # encrypt all values in existing Gist (requires GISTENV_ENCRYPTION_KEY)
npx gistenv sections    # list sections
npx gistenv list        # list all vars by section
```

Download: `npx gistenv download -o .env.local` to write to another file.

## GitHub Actions Integration

Automatically download environment variables for different environments in your CI/CD pipeline:

```yaml
- name: Download env from Gist
  env:
    GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
    GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
    GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
  run: npx gistenv download --section staging --mode replace -o .env
```

**Multi-project support:** One Gist can contain multiple projects/sites, each with their own environments:
- `--section "MyApp Production"` - for MyApp production
- `--section "MyApp Staging"` - for MyApp staging
- `--section "WeatherApp Production"` - for WeatherApp production
- Or simple: `--section production` - if using environment-based sections

**Note:** Use quotes for section names with spaces: `--section "ProjectName Environment"`

**Setup:**
1. Add secrets to your GitHub repository: Settings → Secrets and variables → Actions
2. Add `GISTENV_GIST_ID`, `GISTENV_GITHUB_TOKEN`, and optionally `GISTENV_ENCRYPTION_KEY`
3. Use different `--section` values for different environments in your workflows

**Non-interactive flags:**
- `--section <name>` - Specify section name (required for CI/CD, must match section name in Gist)
- `--mode <append|replace>` - Write mode (default: replace)
- `-o, --output <file>` - Output file path

See `.github/workflows/example-*.yml` for complete examples with multiple environments.

## License

MIT
