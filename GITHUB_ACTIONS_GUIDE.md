# Guide: How to use gistenv in GitHub Actions

## Step 1: Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secrets:

### Required Secrets:

**`GISTENV_GIST_ID`**
- Value: Your Gist ID
- Example: If the URL is `https://gist.github.com/username/abc123def456`, then the ID is `abc123def456`

**`GISTENV_GITHUB_TOKEN`**
- Value: GitHub Personal Access Token
- How to create:
  1. GitHub → Settings → Developer settings
  2. Personal access tokens → Tokens (classic)
  3. Generate new token (classic)
  4. Select scope: `gist` (read and write)
  5. Generate and copy the token

### Optional Secrets:

**`GISTENV_ENCRYPTION_KEY`**
- Value: Your encryption key (min 16 characters)
- Add only if you're using encryption in your Gist

---

## Step 2: Create Workflow File

Create a file in your project:

```
.github/workflows/deploy.yml
```

### Example 1: Project-based sections (RECOMMENDED for multiple projects)

**Best for projects where you have multiple sites/projects in one Gist:**

```yaml
name: Deploy MyApp

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - Production
          - Staging
          - Test
        default: 'Staging'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for "MyApp {Environment}"
      # Section name combines project name + environment
      - name: Download environment variables
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          ENV="${{ github.event.inputs.environment }}"
          SECTION_NAME="MyApp $ENV"
          echo "Downloading environment variables for: $SECTION_NAME"
          npx gistenv download --section "$SECTION_NAME" --mode replace -o .env
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to ${{ github.event.inputs.environment }}
        run: npm start
```

### Example 1b: Deploy with environment selection (Environment-based - for single project)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production
        default: 'staging'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for selected environment
      # Section name in Gist must match the environment (staging, production, etc.)
      - name: Download environment variables for ${{ github.event.inputs.environment }}
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          ENV_NAME="${{ github.event.inputs.environment }}"
          echo "Downloading environment variables for: $ENV_NAME"
          npx gistenv download --section "$ENV_NAME" --mode replace -o .env
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to ${{ github.event.inputs.environment }}
        run: npm start
```

### Example 2: Test with different test environments

```yaml
name: Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      test_environment:
        description: 'Test environment'
        required: false
        type: choice
        options:
          - test
          - ci
        default: 'test'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for test environment
      # You can use different sections: "test" for local/PR tests, "ci" for CI environment
      - name: Download test environment variables
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          TEST_ENV="${{ github.event.inputs.test_environment || 'test' }}"
          echo "Downloading environment variables for: $TEST_ENV"
          npx gistenv download --section "$TEST_ENV" --mode replace -o .env
      
      - name: Run tests
        run: npm test
```

### Example 3: Automatic deploy based on branch

```yaml
name: Auto Deploy by Branch

on:
  push:
    branches:
      - develop    # Deploy to development
      - staging     # Deploy to staging
      - main        # Deploy to production

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
    steps:
      - id: set-env
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/staging" ]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/develop" ]; then
            echo "environment=development" >> $GITHUB_OUTPUT
          else
            echo "environment=development" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: determine-environment
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for environment determined by branch
      # Section name in Gist must be: development, staging, or production
      - name: Download environment variables for ${{ needs.determine-environment.outputs.environment }}
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          ENV_NAME="${{ needs.determine-environment.outputs.environment }}"
          echo "Deploying to environment: $ENV_NAME"
          npx gistenv download --section "$ENV_NAME" --mode replace -o .env
      
      - name: Build
        run: npm run build
      
      - name: Deploy to ${{ needs.determine-environment.outputs.environment }}
        run: |
          echo "Deploying to ${{ needs.determine-environment.outputs.environment }}"
          # Your deployment logic here
```

---

## Step 3: Gist Structure with Multiple Sections

**IMPORTANT:** One Gist can contain multiple sections. Sections can be organized by project/site, environment, or a combination of both. Each section is separated by a `# [SectionName]` header.

### Option 1: Project-based sections (RECOMMENDED)

**Best for multiple projects/sites in one Gist:**

```
# [MyApp Production]
WEATHER_API_KEY=prod_weather_key_123
MAP_API_KEY=prod_map_key_456
DB_URL=prod.db.example.com

# [MyApp Staging]
WEATHER_API_KEY=staging_weather_key_789
MAP_API_KEY=staging_map_key_abc
DB_URL=staging.db.example.com

# [MyApp Test]
WEATHER_API_KEY=test_weather_key_xyz
MAP_API_KEY=test_map_key_def
DB_URL=test.db.example.com

# [WeatherApp Production]
API_KEY=weather_app_prod_key
DB_URL=weather.db.example.com

# [WeatherApp Staging]
API_KEY=weather_app_staging_key
DB_URL=weather-staging.db.example.com
```

**Advantages:**
- ✅ One Gist for all projects
- ✅ Clear project distinction
- ✅ Easy to add new projects
- ✅ Each project can have its own environments

**Usage in workflow:**
```bash
npx gistenv download --section "MyApp Production" --mode replace -o .env
npx gistenv download --section "MyApp Staging" --mode replace -o .env
npx gistenv download --section "WeatherApp Production" --mode replace -o .env
```

### Option 2: Environment-based sections

**For a single project with multiple environments:**

```
# [Development]
API_KEY=dev_key_123
DB_URL=localhost:5432
DEBUG=true

# [Test]
API_KEY=test_key_456
DB_URL=test.db.example.com
DEBUG=true

# [Staging]
API_KEY=staging_key_abc
DB_URL=staging.db.example.com
DEBUG=false

# [Production]
API_KEY=prod_key_xyz
DB_URL=prod.db.example.com
SECRET_TOKEN=encrypted_value_if_using_encryption
DEBUG=false
```

**Usage in workflow:**
```bash
npx gistenv download --section production --mode replace -o .env
npx gistenv download --section staging --mode replace -o .env
```

### How to choose structure:

- **Multiple projects/sites?** → Use project-based: `"ProjectName Environment"`
- **Single project, multiple environments?** → Use environment-based: `production`, `staging`, etc.
- **Combination?** → You can combine: `"MyApp Production"`, `"WeatherApp Staging"`, etc.

**Note:** Section names must exactly match what you use in the `--section` flag in your workflow (case-sensitive)!

---

## Command Explanation in Action

```bash
npx gistenv download --section production --mode replace -o .env
```

- `npx gistenv download` - Runs the download command
- `--section production` - Downloads only the "production" section from Gist (non-interactive)
  - **IMPORTANT:** Section name must exactly match the name in Gist (`# [Production]`)
  - You can use any name: `staging`, `development`, `test`, `ci`, etc.
- `--mode replace` - Replaces existing `.env` file (instead of appending)
  - `replace` - completely replaces the file
  - `append` - adds to the end of existing file
- `-o .env` - Output file name (default is `.env`)

### Examples with different sections:

**Project-based sections:**
```bash
# Download MyApp Production
npx gistenv download --section "MyApp Production" --mode replace -o .env

# Download MyApp Staging
npx gistenv download --section "MyApp Staging" --mode replace -o .env

# Download WeatherApp Production
npx gistenv download --section "WeatherApp Production" --mode replace -o .env
```

**Environment-based sections:**
```bash
# Download staging environment
npx gistenv download --section staging --mode replace -o .env

# Download development environment
npx gistenv download --section development --mode replace -o .env

# Download test environment
npx gistenv download --section test --mode replace -o .env
```

**Note:** When using sections with spaces (e.g., "MyApp Production"), always use quotes!

---

## Troubleshooting

### Problem: "Gist not found"
- Check if `GISTENV_GIST_ID` is correct
- Check if Gist is public or if token has access to private Gist

### Problem: "Invalid GitHub token"
- Check if token has `gist` scope
- Check if token has expired

### Problem: "Section not found"
- Check if section exists in Gist (name must be exact, case-sensitive)
- Check if section name in Gist is exactly `# [SectionName]` (with brackets and capitalization)
- Use `gistenv sections` locally to see available sections
- Example: If you use `--section production` in workflow, Gist must have `# [Production]` (not `# [production]` or `# [PRODUCTION]`)

### Problem: "Failed to decrypt value"
- Check if `GISTENV_ENCRYPTION_KEY` is set if using encryption
- Check if encryption key is correct

---

## Best Practices

1. **Use Private Gist** for production secrets
2. **Project-based sections for multiple projects:**
   - Format: `"ProjectName Environment"` (e.g., `"MyApp Production"`, `"WeatherApp Staging"`)
   - Allows one Gist to contain env variables for multiple projects/sites
   - Each project can have its own environments (Production, Staging, Test)
3. **Environment-based sections for single project:**
   - Format: `production`, `staging`, `test`, `development`
   - Simpler if you only have one project
4. **Consistent section names** - use the same names in Gist and workflow
5. **Case-sensitive** - section names are case-sensitive (`Production` ≠ `production`)
6. **Quotes for sections with spaces** - `--section "MyApp Production"` (not `--section MyApp Production`)
7. **Never commit** `.env` file to git
8. **Add `.env` to `.gitignore`**
9. **Rotate tokens** regularly
10. **Use encryption** for sensitive data
11. **One Gist for all projects** - easier maintenance than multiple Gists

---

## Complete Workflow Examples

### Example 1: Simple CI/CD Pipeline (Test + Deploy)

**File:** `.github/workflows/deploy.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Download test env
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
        run: npx gistenv download --section test --mode replace -o .env
      
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      
      - name: Download production env
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: npx gistenv download --section production --mode replace -o .env
      
      - run: npm run build
      - run: npm start
```

### Example 2: Project-based Deployment with Manual Selection

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy MyApp

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - Production
          - Staging
          - Test
        default: 'Staging'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for "MyApp {Environment}"
      # Section name combines project name + environment
      - name: Download environment variables
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          ENV="${{ github.event.inputs.environment }}"
          SECTION_NAME="MyApp $ENV"
          echo "Downloading environment variables for: $SECTION_NAME"
          npx gistenv download --section "$SECTION_NAME" --mode replace -o .env
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to ${{ github.event.inputs.environment }}
        run: npm start
```

**Gist structure for this workflow:**
```
# [MyApp Production]
API_KEY=prod_key_123
DB_URL=prod.db.example.com

# [MyApp Staging]
API_KEY=staging_key_456
DB_URL=staging.db.example.com

# [MyApp Test]
API_KEY=test_key_789
DB_URL=test.db.example.com
```

### Example 3: Automatic Deploy Based on Branch

**File:** `.github/workflows/auto-deploy.yml`

```yaml
name: Auto Deploy by Branch

on:
  push:
    branches:
      - develop    # Deploy to development
      - staging    # Deploy to staging
      - main       # Deploy to production

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
    steps:
      - id: set-env
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/staging" ]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" == "refs/heads/develop" ]; then
            echo "environment=development" >> $GITHUB_OUTPUT
          else
            echo "environment=development" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: determine-environment
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for environment determined by branch
      # Section name in Gist must be: development, staging, or production
      - name: Download environment variables for ${{ needs.determine-environment.outputs.environment }}
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          ENV_NAME="${{ needs.determine-environment.outputs.environment }}"
          echo "Deploying to environment: $ENV_NAME"
          npx gistenv download --section "$ENV_NAME" --mode replace -o .env
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to ${{ needs.determine-environment.outputs.environment }}
        run: |
          echo "Deploying to ${{ needs.determine-environment.outputs.environment }}"
          # Your deployment logic here
```

**Gist structure for this workflow:**
```
# [Development]
API_KEY=dev_key_123
DB_URL=localhost:5432

# [Staging]
API_KEY=staging_key_456
DB_URL=staging.db.example.com

# [Production]
API_KEY=prod_key_789
DB_URL=prod.db.example.com
```

### Example 4: Testing with Multiple Test Environments

**File:** `.github/workflows/test.yml`

```yaml
name: Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      test_environment:
        description: 'Test environment'
        required: false
        type: choice
        options:
          - test
          - ci
        default: 'test'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Download env variables for test environment
      # You can use different sections: "test" for local/PR tests, "ci" for CI environment
      - name: Download test environment variables
        env:
          GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
          GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
          GISTENV_ENCRYPTION_KEY: ${{ secrets.GISTENV_ENCRYPTION_KEY }}
        run: |
          TEST_ENV="${{ github.event.inputs.test_environment || 'test' }}"
          echo "Downloading environment variables for: $TEST_ENV"
          npx gistenv download --section "$TEST_ENV" --mode replace -o .env
      
      - name: Run tests
        run: npm test
```

**Gist structure for this workflow:**
```
# [Test]
API_KEY=test_key_123
DB_URL=test.db.example.com

# [CI]
API_KEY=ci_key_456
DB_URL=ci.db.example.com
```

---

## Important Notes

### Using `npx gistenv` vs `node dist/cli.js`

- **If `gistenv` is published to npm:** Use `npx gistenv` (as shown in examples above)
- **If `gistenv` is NOT published to npm (local development):** You need to build it first:

```yaml
- name: Install dependencies
  run: npm ci

- name: Build gistenv
  run: npm run build

- name: Download environment variables
  env:
    GISTENV_GIST_ID: ${{ secrets.GISTENV_GIST_ID }}
    GISTENV_GITHUB_TOKEN: ${{ secrets.GISTENV_GITHUB_TOKEN }}
  run: node dist/cli.js download --section test --mode replace -o .env
```

### Workflow File Location

All workflow files should be placed in:
```
.github/workflows/
```

Examples:
- `.github/workflows/deploy.yml`
- `.github/workflows/test.yml`
- `.github/workflows/ci.yml`
