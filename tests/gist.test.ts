import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseEnvContent,
  encryptEnvContent,
  removeSectionFromContent,
} from '../src/gist';
import * as cryptoModule from '../src/crypto';

describe('gist', () => {
  beforeEach(() => {
    delete process.env.GISTENV_GIST_ID;
    delete process.env.GIST_ID;
    delete process.env.GISTENV_GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GISTENV_ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseEnvContent', () => {
    it('should parse simple env content', () => {
      const content = 'API_KEY=test_key\nDB_URL=localhost:5432\n';
      const result = parseEnvContent(content, false);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ key: 'API_KEY', value: 'test_key' });
      expect(result[1]).toEqual({ key: 'DB_URL', value: 'localhost:5432' });
    });

    it('should parse content with sections', () => {
      const content = `# [Production]
API_KEY=prod_key
DB_URL=prod.db.com

# [Staging]
API_KEY=staging_key
DB_URL=staging.db.com`;

      const result = parseEnvContent(content, false);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ key: 'API_KEY', value: 'prod_key', section: 'Production' });
      expect(result[1]).toEqual({ key: 'DB_URL', value: 'prod.db.com', section: 'Production' });
      expect(result[2]).toEqual({ key: 'API_KEY', value: 'staging_key', section: 'Staging' });
      expect(result[3]).toEqual({ key: 'DB_URL', value: 'staging.db.com', section: 'Staging' });
    });

    it('should parse project-based sections', () => {
      const content = `# [MyApp Production]
WEATHER_API_KEY=prod_key
MAP_API_KEY=map_key

# [MyApp Staging]
WEATHER_API_KEY=staging_key`;

      const result = parseEnvContent(content, false);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ key: 'WEATHER_API_KEY', value: 'prod_key', section: 'MyApp Production' });
      expect(result[1]).toEqual({ key: 'MAP_API_KEY', value: 'map_key', section: 'MyApp Production' });
      expect(result[2]).toEqual({ key: 'WEATHER_API_KEY', value: 'staging_key', section: 'MyApp Staging' });
    });

    it('should ignore comments', () => {
      const content = `# This is a comment
API_KEY=test_key
# Another comment
DB_URL=localhost`;

      const result = parseEnvContent(content, false);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('API_KEY');
      expect(result[1].key).toBe('DB_URL');
    });

    it('should ignore empty lines', () => {
      const content = 'API_KEY=test_key\n\n\nDB_URL=localhost\n';
      const result = parseEnvContent(content, false);

      expect(result).toHaveLength(2);
    });

    it('should handle values with equals signs', () => {
      const content = 'CONNECTION_STRING=postgresql://user:pass@host:5432/db';
      const result = parseEnvContent(content, false);

      expect(result[0].value).toBe('postgresql://user:pass@host:5432/db');
    });

    it('should decrypt encrypted values when encryption key is available', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'test_key_for_testing_16chars';
      
      const originalValue = 'secret_password';
      const encryptedValue = cryptoModule.encryptValue(originalValue, 'test_key_for_testing_16chars');
      const content = `API_KEY=${encryptedValue}`;

      const result = parseEnvContent(content, true);
      expect(result[0].value).toBe(originalValue);
    });

    it('should keep encrypted values when decryption fails', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'wrong_test_key_16chars';
      
      const encryptedValue = cryptoModule.encryptValue('secret', 'test_key_for_testing_16chars');
      const content = `API_KEY=${encryptedValue}`;

      const result = parseEnvContent(content, true);
      // Should keep encrypted value if decryption fails
      expect(result[0].value).toBe(encryptedValue);
    });

    it('should handle variables without sections', () => {
      const content = 'API_KEY=test_key\nDB_URL=localhost';
      const result = parseEnvContent(content, false);

      expect(result[0].section).toBeUndefined();
      expect(result[1].section).toBeUndefined();
    });

    it('should trim whitespace from keys and values', () => {
      const content = '  API_KEY  =  test_value  \n  DB_URL = localhost  ';
      const result = parseEnvContent(content, false);

      expect(result[0].key).toBe('API_KEY');
      expect(result[0].value).toBe('test_value');
      expect(result[1].key).toBe('DB_URL');
      expect(result[1].value).toBe('localhost');
    });
  });

  describe('encryptEnvContent', () => {
    beforeEach(() => {
      process.env.GISTENV_ENCRYPTION_KEY = 'test_encryption_key_16chars';
    });

    it('should encrypt all values when encryption key is set', () => {
      const content = `API_KEY=secret_key
DB_URL=localhost:5432`;

      const encrypted = encryptEnvContent(content);
      const lines = encrypted.split('\n');

      // Should have ENC: prefix for encrypted values
      expect(encrypted).toContain('API_KEY=ENC:');
      expect(encrypted).toContain('DB_URL=ENC:');
    });

    it('should preserve structure (comments, sections, empty lines)', () => {
      const content = `# [Production]
API_KEY=secret_key

# Comment
DB_URL=localhost`;

      const encrypted = encryptEnvContent(content);

      expect(encrypted).toContain('# [Production]');
      expect(encrypted).toContain('# Comment');
      expect(encrypted).toContain('API_KEY=ENC:');
      expect(encrypted).toContain('DB_URL=ENC:');
    });

    it('should return original content when no encryption key is set', () => {
      delete process.env.GISTENV_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const content = 'API_KEY=test_key\nDB_URL=localhost';
      const result = encryptEnvContent(content);

      expect(result).toBe(content);
    });

    it('should handle empty content', () => {
      const result = encryptEnvContent('');
      expect(result).toBe('');
    });

    it('should handle content with only comments', () => {
      const content = '# Just a comment\n# Another comment';
      const result = encryptEnvContent(content);

      expect(result).toBe(content);
    });

    it('should handle content with only sections', () => {
      const content = '# [Production]\n# [Staging]';
      const result = encryptEnvContent(content);

      expect(result).toBe(content);
    });

    it('should encrypt values but not keys', () => {
      const content = 'SECRET_KEY=secret_value';
      const encrypted = encryptEnvContent(content);

      expect(encrypted).toContain('SECRET_KEY=');
      expect(encrypted).toContain('ENC:');
      expect(encrypted).not.toContain('secret_value');
    });
  });

  describe('removeSectionFromContent', () => {
    it('should remove a section completely', () => {
      const content = `# [Production]
API_KEY=prod_key
DB_URL=prod.db.com

# [Staging]
API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'Production');

      expect(result).not.toContain('# [Production]');
      expect(result).not.toContain('API_KEY=prod_key');
      expect(result).not.toContain('DB_URL=prod.db.com');
      expect(result).toContain('# [Staging]');
      expect(result).toContain('API_KEY=staging_key');
    });

    it('should remove section at the beginning', () => {
      const content = `# [Production]
API_KEY=prod_key

# [Staging]
API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'Production');

      expect(result).not.toContain('# [Production]');
      expect(result).not.toContain('API_KEY=prod_key');
      expect(result).toContain('# [Staging]');
    });

    it('should remove section at the end', () => {
      const content = `# [Production]
API_KEY=prod_key

# [Staging]
API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'Staging');

      expect(result).toContain('# [Production]');
      expect(result).not.toContain('# [Staging]');
      expect(result).not.toContain('API_KEY=staging_key');
    });

    it('should remove project-based sections', () => {
      const content = `# [MyApp Production]
WEATHER_API_KEY=prod_key

# [MyApp Staging]
WEATHER_API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'MyApp Production');

      expect(result).not.toContain('# [MyApp Production]');
      expect(result).not.toContain('WEATHER_API_KEY=prod_key');
      expect(result).toContain('# [MyApp Staging]');
    });

    it('should preserve other sections when removing one', () => {
      const content = `# [Production]
API_KEY=prod_key

# [Staging]
API_KEY=staging_key

# [Test]
API_KEY=test_key`;

      const result = removeSectionFromContent(content, 'Staging');

      expect(result).toContain('# [Production]');
      expect(result).toContain('API_KEY=prod_key');
      expect(result).not.toContain('# [Staging]');
      expect(result).not.toContain('API_KEY=staging_key');
      expect(result).toContain('# [Test]');
      expect(result).toContain('API_KEY=test_key');
    });

    it('should handle non-existent section gracefully', () => {
      const content = `# [Production]
API_KEY=prod_key`;

      const result = removeSectionFromContent(content, 'NonExistent');

      expect(result).toBe(content);
    });

    it('should handle empty content', () => {
      const result = removeSectionFromContent('', 'Production');
      expect(result).toBe('');
    });

    it('should handle content with only the section to remove', () => {
      const content = `# [Production]
API_KEY=prod_key`;

      const result = removeSectionFromContent(content, 'Production');

      expect(result.trim()).toBe('');
    });

    it('should preserve multiple empty lines between sections', () => {
      const content = `# [Production]
API_KEY=prod_key


# [Staging]
API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'Production');

      expect(result).toContain('# [Staging]');
      expect(result).not.toContain('# [Production]');
    });

    it('should handle section with no variables', () => {
      const content = `# [Production]

# [Staging]
API_KEY=staging_key`;

      const result = removeSectionFromContent(content, 'Production');

      expect(result).not.toContain('# [Production]');
      expect(result).toContain('# [Staging]');
    });
  });
});
