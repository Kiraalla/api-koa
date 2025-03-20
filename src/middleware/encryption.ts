import crypto from 'crypto';
import { Context, Next } from 'koa';
import { logger } from '../utils/logger';

// 定义加密密钥和初始化向量长度
let ENCRYPTION_KEY: string;
const IV_LENGTH = 16; // For AES, this is always 16

// 检查环境变量并返回加密密钥
function checkEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // 验证密钥长度
  const keyBuffer = Buffer.from(key);
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) long');
  }
  return key;
}

// 初始化加密密钥
export function initializeEncryptionKey() {
  ENCRYPTION_KEY = checkEncryptionKey();
}

// 在测试环境下，让测试用例控制初始化时机
if (process.env.NODE_ENV !== 'test') {
  ENCRYPTION_KEY = checkEncryptionKey();
}

/**
 * 加密数据
 * @param text 要加密的文本
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    initializeEncryptionKey();
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * 解密数据
 * @param text 要解密的文本
 */
export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    initializeEncryptionKey();
  }
  const textParts = text.split(':');
  const ivPart = textParts.shift();
  if (!ivPart || !textParts.length) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivPart, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * 加密中间件
 * 对请求体进行加密处理
 */
export async function encryptionMiddleware(ctx: Context, next: Next) {
  // 检查是否需要加密（可以通过请求头或其他方式判断）
  const needsEncryption = ctx.get('x-needs-encryption') === 'true';

  if (needsEncryption) {
    try {
      // 解密请求数据
      if (ctx.request.body && typeof ctx.request.body === 'string') {
        try {
          const decryptedBody = decrypt(ctx.request.body);
          ctx.request.body = JSON.parse(decryptedBody);
        } catch (decryptError) {
          logger.error('请求解密失败', { error: decryptError, path: ctx.path });
          ctx.throw(400, 'Encryption/Decryption failed');
        }
      }

      // 继续处理请求
      await next();

      // 加密响应数据
      if (ctx.body) {
        try {
          const responseStr = JSON.stringify(ctx.body);
          ctx.body = encrypt(responseStr);
          ctx.set('x-encrypted-response', 'true');
        } catch (encryptError) {
          logger.error('响应加密失败', { error: encryptError, path: ctx.path });
          ctx.throw(500, '响应数据加密失败');
        }
      }
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 400 || (error as { status?: number }).status === 500) {
        throw error; // 重新抛出已处理的错误
      }
      logger.error('加密中间件错误', { error, path: ctx.path });
      ctx.throw(400, '加密/解密处理失败');
    }
  } else {
    await next();
  }
}