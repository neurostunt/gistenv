// Inline EnvVariable type
type EnvVariable = {
  key: string;
  value: string;
  section?: string;
};

interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  truncated: boolean;
  content: string;
}

interface GistResponse {
  files: Record<string, GistFile>;
  id: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string;
}

export const fetchGist = async (): Promise<string> => {
  // Support both GISTENV_GIST_ID and GIST_ID for flexibility
  const gistId = process.env.GISTENV_GIST_ID || process.env.GIST_ID;
  // Support both GISTENV_GITHUB_TOKEN and GITHUB_TOKEN
  const githubToken = process.env.GISTENV_GITHUB_TOKEN || process.env.GITHUB_TOKEN;

  if (!gistId) {
    throw new Error('Gist ID not set. Please set GISTENV_GIST_ID or GIST_ID in your .gistenv or environment.');
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json'
  };
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Gist not found. Check your Gist ID.');
    } else if (response.status === 401) {
      throw new Error('Invalid GitHub token. Set GISTENV_GITHUB_TOKEN or GITHUB_TOKEN in your .gistenv or environment.');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GistResponse;

  // Get the .env file from the gist
  const envFile = Object.values(data.files).find(file =>
    file.filename.endsWith('.env') || file.filename === '.env'
  );

  if (!envFile) {
    throw new Error('No .env file found in the Gist');
  }

  return envFile.content;
};

export const parseEnvContent = (content: string): EnvVariable[] => {
  const lines = content.split('\n');
  const variables: EnvVariable[] = [];
  let currentSection: string | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      // Check if this is a section header
      if (trimmedLine.startsWith('# [') && trimmedLine.endsWith(']')) {
        currentSection = trimmedLine.substring(3, trimmedLine.length - 1);
      }
      continue;
    }

    // Parse env variable
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      variables.push({
        key: key.trim(),
        value: value.trim(),
        section: currentSection
      });
    }
  }

  return variables;
};

export const getSectionVariables = async (sectionName: string): Promise<EnvVariable[]> => {
  const content = await fetchGist();
  const variables = parseEnvContent(content);

  return variables.filter(v => v.section === sectionName);
};

export const getVariables = async (variableNames: string[]): Promise<EnvVariable[]> => {
  const content = await fetchGist();
  const variables = parseEnvContent(content);

  return variables.filter(v => variableNames.includes(v.key));
};
