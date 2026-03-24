/**
 * AES-256 加密/解密工具
 * 用于加密存储 API Token
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

/**
 * 从环境变量获取或派生加密密钥
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn('[crypto] TOKEN_ENCRYPTION_KEY not set, using fallback (NOT SECURE FOR PRODUCTION!)');
    // Fallback for development only - should never be used in production
    return crypto.scryptSync('fallback-key-do-not-use-in-production', 'salt', KEY_LENGTH);
  }
  
  // Derive a fixed-length key from the environment variable
  return crypto.scryptSync(envKey, 'teamclaw-salt-v1', KEY_LENGTH);
}

/**
 * 加密字符串
 * @param text 要加密的明文
 * @returns 加密后的字符串（格式: salt:iv:authTag:ciphertext，均为 hex）
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    // 生成随机盐
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // 使用 PBKDF2 派生密钥
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, ITERATIONS, KEY_LENGTH, DIGEST);
    
    // 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 返回格式: salt:iv:authTag:ciphertext
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted,
    ].join(':');
  } catch (error) {
    console.error('[crypto] Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * 解密字符串
 * @param encryptedData 加密后的字符串（格式: salt:iv:authTag:ciphertext）
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    // 解析加密数据
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, authTagHex, ciphertext] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // 派生密钥
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, ITERATIONS, KEY_LENGTH, DIGEST);
    
    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // 解密数据
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[crypto] Decryption failed:', error);
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
}

/**
 * 脱敏 API Key
 * 只显示前 3 位和后 3 位，中间用 ... 替代
 * @param apiKey 原始 API Key
 * @returns 脱敏后的 API Key
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 6) {
    return apiKey || '';
  }
  
  const prefix = apiKey.slice(0, 3);
  const suffix = apiKey.slice(-3);
  return `${prefix}...${suffix}`;
}

/**
 * 验证环境变量配置
 */
export function validateCryptoConfig(): boolean {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.warn('[crypto] WARNING: TOKEN_ENCRYPTION_KEY is not set!');
    return false;
  }
  
  if (process.env.TOKEN_ENCRYPTION_KEY.length < 32) {
    console.warn('[crypto] WARNING: TOKEN_ENCRYPTION_KEY should be at least 32 characters!');
    return false;
  }
  
  return true;
}
