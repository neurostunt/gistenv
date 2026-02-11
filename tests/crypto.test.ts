import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptValue,
  decryptValue,
  isEncryptionAvailable,
  getEncryptionKey,
} from '../src/crypto';

describe('crypto', () => {
  const TEST_KEY = 'test_encryption_key_min_16_chars';

  beforeEach(() => {
    delete process.env.GISTENV_ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    delete process.env.GISTENV_ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encryptValue', () => {
    it('should encrypt a value', () => {
      const value = 'secret_password_123';
      const encrypted = encryptValue(value, TEST_KEY);

      expect(encrypted).toBeTruthy();
      expect(encrypted.startsWith('ENC:')).toBe(true);
      expect(encrypted).not.toBe(value);
      expect(encrypted.length).toBeGreaterThan(value.length);
    });

    it('should produce different encrypted values for same input (due to random salt/IV)', () => {
      const value = 'same_value';
      const encrypted1 = encryptValue(value, TEST_KEY);
      const encrypted2 = encryptValue(value, TEST_KEY);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = encryptValue('', TEST_KEY);
      expect(encrypted).toBe('');
    });

    it('should handle special characters', () => {
      const value = 'special!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptValue(value, TEST_KEY);
      const decrypted = decryptValue(encrypted, TEST_KEY);
      expect(decrypted).toBe(value);
    });

    it('should handle unicode characters', () => {
      const value = '测试 🚀 émojis';
      const encrypted = encryptValue(value, TEST_KEY);
      const decrypted = decryptValue(encrypted, TEST_KEY);
      expect(decrypted).toBe(value);
    });
  });

  describe('decryptValue', () => {
    it('should decrypt an encrypted value', () => {
      const original = 'secret_password_123';
      const encrypted = encryptValue(original, TEST_KEY);
      const decrypted = decryptValue(encrypted, TEST_KEY);

      expect(decrypted).toBe(original);
    });

    it('should return unencrypted value as-is (backward compatibility)', () => {
      const value = 'plain_text_value';
      const result = decryptValue(value, TEST_KEY);
      expect(result).toBe(value);
    });

    it('should throw error for invalid encrypted value', () => {
      const invalidEncrypted = 'ENC:invalid_base64_data!!!';
      expect(() => decryptValue(invalidEncrypted, TEST_KEY)).toThrow('Failed to decrypt');
    });

    it('should throw error for wrong encryption key', () => {
      const original = 'secret_value';
      const encrypted = encryptValue(original, TEST_KEY);
      const wrongKey = 'wrong_key_min_16_chars';

      expect(() => decryptValue(encrypted, wrongKey)).toThrow('Failed to decrypt');
    });

    it('should handle empty encrypted value', () => {
      const result = decryptValue('', TEST_KEY);
      expect(result).toBe('');
    });
  });

  describe('encryptValue + decryptValue roundtrip', () => {
    it('should encrypt and decrypt various values correctly', () => {
      const testCases = [
        'simple_value',
        'value with spaces',
        'value=with=equals',
        'value\nwith\nnewlines',
        'value\twith\ttabs',
        '1234567890',
        '',
        'a'.repeat(1000), // Long value
      ];

      for (const value of testCases) {
        const encrypted = encryptValue(value, TEST_KEY);
        const decrypted = decryptValue(encrypted, TEST_KEY);
        expect(decrypted).toBe(value);
      }
    });
  });

  describe('isEncryptionAvailable', () => {
    it('should return false when no key is set', () => {
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('should return false when key is too short', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'short';
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('should return true when GISTENV_ENCRYPTION_KEY is set and long enough', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'valid_key_min_16_chars';
      expect(isEncryptionAvailable()).toBe(true);
    });

    it('should return true when ENCRYPTION_KEY is set and long enough', () => {
      process.env.ENCRYPTION_KEY = 'valid_key_min_16_chars';
      expect(isEncryptionAvailable()).toBe(true);
    });

    it('should prefer GISTENV_ENCRYPTION_KEY over ENCRYPTION_KEY', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'gistenv_key_min_16_chars';
      process.env.ENCRYPTION_KEY = 'encryption_key_min_16_chars';
      expect(getEncryptionKey()).toBe('gistenv_key_min_16_chars');
    });
  });

  describe('getEncryptionKey', () => {
    it('should return undefined when no key is set', () => {
      expect(getEncryptionKey()).toBeUndefined();
    });

    it('should return GISTENV_ENCRYPTION_KEY when set', () => {
      process.env.GISTENV_ENCRYPTION_KEY = 'test_key_123';
      expect(getEncryptionKey()).toBe('test_key_123');
    });

    it('should return ENCRYPTION_KEY when GISTENV_ENCRYPTION_KEY is not set', () => {
      process.env.ENCRYPTION_KEY = 'test_key_456';
      expect(getEncryptionKey()).toBe('test_key_456');
    });
  });
});
