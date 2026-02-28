import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key
const ITERATIONS = 100000;

const ENCRYPTION_PREFIX = 'ENC:';

/**
 * Derives a 32-byte key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts a value using AES-256-GCM
 * Returns format: ENC:base64(salt:iv:tag:encrypted)
 */
export function encryptValue(value: string, encryptionKey: string): string {
  if (!value) return value;
  // Already encrypted, skip
  if (value.startsWith(ENCRYPTION_PREFIX)) return value;
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt:iv:tag:encrypted
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  const encoded = combined.toString('base64');
  
  return ENCRYPTION_PREFIX + encoded;
}

/**
 * Decrypts a value that was encrypted with encryptValue
 * Returns original value or throws if decryption fails
 */
function tryDecrypt(encoded: string, encryptionKey: string, ivLength: number): string {
  const combined = Buffer.from(encoded, 'base64');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + ivLength);
  const tag = combined.subarray(SALT_LENGTH + ivLength, SALT_LENGTH + ivLength + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + ivLength + TAG_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function decryptValue(encryptedValue: string, encryptionKey: string): string {
  if (!encryptedValue.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedValue;
  }
  
  const encoded = encryptedValue.slice(ENCRYPTION_PREFIX.length);
  
  // Try both IV lengths to handle legacy data (IV=16 was used before IV=12 standard)
  for (const ivLen of [...new Set([IV_LENGTH, 16, 12])]) {
    try {
      return tryDecrypt(encoded, encryptionKey, ivLen);
    } catch {
      // try next
    }
  }
  
  throw new Error(`Failed to decrypt value: wrong key or corrupted data`);
}

/**
 * Checks if encryption is available (key is set)
 */
export function isEncryptionAvailable(): boolean {
  const key = process.env.GISTENV_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  return !!key && key.length >= 16; // Minimum key length
}

/**
 * Gets the encryption key from environment
 */
export function getEncryptionKey(): string | undefined {
  return process.env.GISTENV_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
}
