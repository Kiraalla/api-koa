import { Context, Next } from 'koa';
import crypto from 'crypto';

// 加密配置
import dotenvFlow from 'dotenv-flow';

// 加载环境变量
dotenvFlow.config({
  silent: true,
  path: process.cwd(),
  purge_dotenv: true
});

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, this is always 16

// 验证密钥长度
if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) long');
}

/**
 * 加密数据
 * @param text 要加密的文本
 */
export function encrypt(text: string): string {
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
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
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
        const decryptedBody = decrypt(ctx.request.body);
        ctx.request.body = JSON.parse(decryptedBody);
      }

      // 继续处理请求
      await next();

      // 加密响应数据
      if (ctx.body) {
        const responseStr = JSON.stringify(ctx.body);
        ctx.body = encrypt(responseStr);
        ctx.set('x-encrypted-response', 'true');
      }
    } catch (error) {
      ctx.throw(400, 'Encryption/Decryption failed');
    }
  } else {
    await next();
  }
}