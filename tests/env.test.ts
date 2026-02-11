import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadEnvFile, writeEnvFile } from '../src/env';

describe('env', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-tmp');
  const TEST_ENV_FILE = path.join(TEST_DIR, '.env');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Clean up any existing test files
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmdirSync(TEST_DIR);
    }
  });

  describe('loadEnvFile', () => {
    it('should return empty object for non-existent file', () => {
      const result = loadEnvFile('non-existent-file.env');
      expect(result).toEqual({});
    });

    it('should load env variables from file', () => {
      const content = 'API_KEY=test_key_123\nDB_URL=localhost:5432\n';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        API_KEY: 'test_key_123',
        DB_URL: 'localhost:5432',
      });
    });

    it('should ignore comments', () => {
      const content = '# This is a comment\nAPI_KEY=test_key\n# Another comment\nDB_URL=localhost';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        API_KEY: 'test_key',
        DB_URL: 'localhost',
      });
    });

    it('should ignore empty lines', () => {
      const content = 'API_KEY=test_key\n\n\nDB_URL=localhost\n';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        API_KEY: 'test_key',
        DB_URL: 'localhost',
      });
    });

    it('should handle values with equals signs', () => {
      const content = 'CONNECTION_STRING=postgresql://user:pass@host:5432/db';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        CONNECTION_STRING: 'postgresql://user:pass@host:5432/db',
      });
    });

    it('should trim whitespace from keys and values', () => {
      const content = '  API_KEY  =  test_value  \n  DB_URL = localhost  ';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        API_KEY: 'test_value',
        DB_URL: 'localhost',
      });
    });

    it('should handle empty values', () => {
      const content = 'EMPTY_KEY=\nNORMAL_KEY=value';
      fs.writeFileSync(TEST_ENV_FILE, content);

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result).toEqual({
        EMPTY_KEY: '',
        NORMAL_KEY: 'value',
      });
    });
  });

  describe('writeEnvFile', () => {
    it('should write variables in replace mode', () => {
      const variables = [
        { key: 'API_KEY', value: 'test_key', section: 'Production' },
        { key: 'DB_URL', value: 'localhost:5432', section: 'Production' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'replace');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).toContain('# [Production]');
      expect(content).toContain('API_KEY=test_key');
      expect(content).toContain('DB_URL=localhost:5432');
    });

    it('should write variables in append mode', () => {
      // Create existing file
      fs.writeFileSync(TEST_ENV_FILE, 'EXISTING_KEY=existing_value\n');

      const variables = [
        { key: 'NEW_KEY', value: 'new_value', section: 'Production' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'append');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).toContain('EXISTING_KEY=existing_value');
      expect(content).toContain('# --- Added by gistenv ---');
      expect(content).toContain('# [Production]');
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('should add variables from section even if they exist in append mode', () => {
      fs.writeFileSync(TEST_ENV_FILE, 'EXISTING_KEY=existing_value\n');

      const variables = [
        { key: 'EXISTING_KEY', value: 'new_value', section: 'Production' },
        { key: 'NEW_KEY', value: 'new_value', section: 'Production' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'append');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      // In append mode, we add all variables from the section
      // This allows downloading multiple sections even with overlapping keys
      expect(content).toContain('EXISTING_KEY=existing_value'); // Original
      expect(content).toContain('EXISTING_KEY=new_value'); // From section
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('should add section headers for grouped variables', () => {
      const variables = [
        { key: 'API_KEY', value: 'key1', section: 'Production' },
        { key: 'DB_URL', value: 'url1', section: 'Production' },
        { key: 'API_KEY', value: 'key2', section: 'Staging' },
        { key: 'DB_URL', value: 'url2', section: 'Staging' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'replace');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).toContain('# [Production]');
      expect(content).toContain('# [Staging]');
    });

    it('should handle variables without sections', () => {
      const variables = [
        { key: 'API_KEY', value: 'test_key' },
        { key: 'DB_URL', value: 'localhost' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'replace');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).toContain('API_KEY=test_key');
      expect(content).toContain('DB_URL=localhost');
      expect(content).not.toContain('# [');
    });

    it('should replace existing file in replace mode', () => {
      fs.writeFileSync(TEST_ENV_FILE, 'OLD_KEY=old_value\n');

      const variables = [
        { key: 'NEW_KEY', value: 'new_value', section: 'Production' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'replace');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).not.toContain('OLD_KEY');
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('should handle empty variables array', () => {
      writeEnvFile([], TEST_ENV_FILE, 'replace');

      const content = fs.readFileSync(TEST_ENV_FILE, 'utf8');
      expect(content).toBe('');
    });

    it('should handle special characters in values', () => {
      const variables = [
        { key: 'SPECIAL', value: 'value=with=equals', section: 'Test' },
        { key: 'QUOTES', value: 'value"with"quotes', section: 'Test' },
      ];

      writeEnvFile(variables, TEST_ENV_FILE, 'replace');

      const result = loadEnvFile(TEST_ENV_FILE);
      expect(result.SPECIAL).toBe('value=with=equals');
      expect(result.QUOTES).toBe('value"with"quotes');
    });
  });
});
