# Guide: How to Encrypt Your Gist

## Prerequisites

1. **Build and link locally:**
   ```bash
   cd /Users/goran/Projects/gistenv
   npm run build
   npm link
   ```

2. **Add encryption key to `.gistenv`:**
   ```
   GISTENV_GIST_ID=your_gist_id
   GISTENV_GITHUB_TOKEN=your_token
   GISTENV_ENCRYPTION_KEY=your_encryption_key_min_16_chars
   ```

## Option 1: Encrypt Entire Gist Directly

**Simplest method - encrypts everything in your Gist:**

```bash
# From any directory (make sure .gistenv has encryption key)
gistenv encrypt
```

This will:
1. Fetch your entire Gist
2. Encrypt all values that aren't already encrypted
3. Replace the Gist with encrypted content

**⚠️ Warning:** This replaces your entire Gist. Make sure you have a backup!

## Option 2: Encrypt Local File First

**If you want to encrypt a local file before uploading:**

1. **Go to directory with your sections file:**
   ```bash
   cd /path/to/your/backup/dir
   ```

2. **Make sure you have `.gistenv` there (or in HOME) with encryption key**

3. **Encrypt the local file:**
   ```bash
   gistenv encrypt all-sections.env
   # Or with output file:
   gistenv encrypt all-sections.env -o all-sections-encrypted.env
   ```

4. **Upload encrypted file back to Gist:**
   ```bash
   # This will add it as a new section
   gistenv upload all-sections-encrypted.env
   ```

## Option 3: Manual Process (Backup First)

**Safest method - backup, then encrypt:**

1. **Download all sections to a backup file:**
   ```bash
   # Download each section manually, or use list to see structure
   gistenv list > backup.txt
   ```

2. **Create a file with all sections** (copy from Gist or combine downloaded sections)

3. **Encrypt the backup file:**
   ```bash
   gistenv encrypt backup.env -o backup-encrypted.env
   ```

4. **Verify encrypted file looks correct:**
   ```bash
   cat backup-encrypted.env
   # Should see ENC: prefixes on values
   ```

5. **Encrypt entire Gist:**
   ```bash
   gistenv encrypt
   ```

## Verification

After encrypting, verify it works:

```bash
# List sections (values should show as encrypted)
gistenv list

# Download a section (should auto-decrypt)
gistenv download --section "MyApp Production"
cat .env
# Values should be decrypted automatically
```

## Troubleshooting

**"GISTENV_ENCRYPTION_KEY not set"**
- Make sure `.gistenv` file exists in current directory or HOME
- Check that `GISTENV_ENCRYPTION_KEY` is at least 16 characters

**"All values are already encrypted"**
- Your Gist already has encrypted values
- This is normal if you've encrypted before

**"No variables found in Gist"**
- Check your Gist ID is correct
- Make sure Gist has a `.env` file

## Notes

- Encryption is **one-way** - once encrypted, you need the key to decrypt
- Always keep a backup of your encryption key
- Encrypted values have `ENC:` prefix
- Download automatically decrypts if key is available
- Upload automatically encrypts if key is available
