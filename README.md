# GistEnv

A CLI tool to copy environment variables from a GitHub Gist to your local `.env` file. Instantly fetch, select, and copy sections or keys—no config or setup required!

## Installation

```bash
npm install -g gistenv
```

## Configuration: Using a .gistenv File

You must store your Gist ID and GitHub token in a `.gistenv` file in your project root or home directory.

### Example `.gistenv` file
```
GISTENV_GIST_ID=your_gist_id_here
GISTENV_GITHUB_TOKEN=your_token_here
```
- `.gistenv` in your project root takes priority over your home directory.
- You can also use `GIST_ID` and `GITHUB_TOKEN` as variable names for compatibility.

## Authentication for Private Gists

Gists containing secrets should always be **private**. You need to provide a GitHub Personal Access Token with the `gist` scope to access private Gists.

#### How to Create a GitHub Token
1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"**
3. Give it a name (e.g., `gistenv`)
4. Select the **`gist`** scope
5. Generate the token and copy it

## Features

- Instantly copy environment variables from a GitHub Gist
- Copy all variables from a section, or select specific keys
- Interactive CLI interface

## Prerequisites

1. Create a GitHub Gist with your environment variables
2. Format the Gist as a `.env` file
3. Use section headers for organization (see below)

### Example Gist Format

```env
# [Development]
API_URL=https://dev-api.example.com
DEBUG=true

# [Production]
API_URL=https://api.example.com
DEBUG=false

# [API Keys]
STRIPE_KEY=sk_test_123456
MAPBOX_API_KEY=pk.abcdef123456
```

## Usage

### List All Sections

```bash
gistenv sections
```
Shows all available sections in your Gist.

### Copy a Section to .env

```bash
gistenv copy-section
```
- Prompts you to select a section
- Prompts for append/replace
- Prompts for output file (default: `.env`)

### List All Keys

```bash
gistenv keys
```
Shows all available keys in your Gist.

### Copy Selected Keys to .env

```bash
gistenv copy-keys
```
- Prompts you to select any keys
- Prompts for append/replace
- Prompts for output file (default: `.env`)

### List All Variables (Grouped by Section)

```bash
gistenv list
```
Shows all variables in your Gist, grouped by section.

### Copy Selected Keys from a Section to .env

```bash
gistenv copy-section-keys
```
- Prompts you to select a section
- Prompts you to select any keys from that section
- Prompts for append/replace
- Prompts for output file (default: `.env`)

## Example Workflow

1. Store all environment variables in a private GitHub Gist
2. Add your Gist ID and token to `.gistenv`
3. Use `gistenv sections` or `gistenv keys` to see what's available
4. Use `gistenv copy-section` or `gistenv copy-keys` to copy what you need to your local `.env`

## Security

- GistEnv reads your GitHub token from your `.gistenv` file (never stores it elsewhere)
- Use private Gists for sensitive data
- Never commit your `.env` or `.gistenv` files to version control

## License

MIT
