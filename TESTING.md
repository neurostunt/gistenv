# Testing GistEnv

This guide will help you test your GistEnv package using a dummy gist file and the new, simplified CLI.

## Prerequisites

1. Make sure you have built the package: `npm run build`
2. Ensure the package is linked: `npm link`

## Setup a GitHub Gist

1. Log into your GitHub account
2. Go to https://gist.github.com/
3. Create a new gist:
   - Set filename to `.env`
   - Copy the contents of `example-gist.env` into the gist
   - Set visibility to "Secret" if you want to keep your environment variables private
   - Click "Create secret gist"
4. After creating the gist, note the gist ID from the URL:
   - e.g., `https://gist.github.com/yourusername/abcdef1234567890abcdef1234567890`
   - The ID is the last part: `abcdef1234567890abcdef1234567890`

## Set Up Your Gist ID and Token

Before running any commands, create a `.gistenv` file in your project root (or home directory) with the following content:

```
GISTENV_GIST_ID=your_gist_id_here
GISTENV_GITHUB_TOKEN=your_token_here
```

Alternatively, you can set these as environment variables:

```bash
export GISTENV_GIST_ID=your_gist_id_here
export GISTENV_GITHUB_TOKEN=your_token_here
```

> **Note:** The CLI will not prompt for your Gist ID or token. You must set them in `.gistenv` or your environment before running any commands.

## Testing Commands

### 1. List All Sections
```bash
gistenv sections
```
- Shows all available sections in your Gist.

### 2. Copy a Section to .env
```bash
gistenv copy-section
```
- Prompts you to select a section
- Prompts for append/replace
- Prompts for output file (default: `.env`)

### 3. List All Keys
```bash
gistenv keys
```
- Shows all available keys in your Gist.

### 4. Copy Selected Keys to .env
```bash
gistenv copy-keys
```
- Prompts you to select any keys
- Prompts for append/replace
- Prompts for output file (default: `.env`)

### 5. List All Variables (Grouped by Section)
```bash
gistenv list
```
- Shows all variables in your Gist, grouped by section.

## Verification

Check the contents of your output file (e.g., `.env`) to ensure the variables were copied correctly:

```bash
cat .env
```

The file should contain all the variables you selected, organized by sections if you used `copy-section`.

## Clean Up

After testing, you can remove the test files:

```bash
rm .env
```

You can also remove your GitHub Gist if you no longer need it.

## Troubleshooting

If you encounter any issues:

1. Make sure your Gist is properly formatted with section headers
2. Make sure your `.gistenv` or environment variables are set before running commands
3. Verify network connectivity to GitHub API
4. Look for error messages in the console output
