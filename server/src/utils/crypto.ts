/**
 * AES-256 加密/解密工具
 * 使用环境变量 TOKEN_ENCRYPTION_KEY 对 API Key 进行加密存储
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  // Derive a 32-byte key from the env var using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * AES-256-GCM 加密
 * 返回格式: base64(iv + ciphertext + authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Concatenate: iv + ciphertext + authTag
  const combined = Buffer.concat([iv, Buffer.from(ciphertext, 'base64'), authTag]);
  return combined.toString('base64');
}

/**
 * AES-256-GCM 解密
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

/**
 * 脱敏 API Key：只显示前3位和后3位
 * 示例: sk-abc123xyz → sk-***xyz
 */
export function maskApiKey(key: string): string {
  if (key.length <= 6) {
    return '***';
  }
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-3);
  return `${prefix}***${suffix}`;
}
