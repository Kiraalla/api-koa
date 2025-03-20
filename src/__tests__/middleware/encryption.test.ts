import { IncomingMessage, ServerResponse } from 'http';
import Application, { Context, Next, Request } from 'koa';
import { decrypt, encrypt, encryptionMiddleware } from '../../middleware/encryption';
import { logger } from '../../utils/logger';

// 模拟环境变量
process.env.ENCRYPTION_KEY = 'a'.repeat(32);

// 模拟logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Encryption Middleware', () => {
  // 测试环境变量检查
  describe('Environment variable checks', () => {
    let originalEnv: string | undefined;
    
    beforeEach(() => {
      // 保存原始环境变量
      originalEnv = process.env.ENCRYPTION_KEY;
      // 清除环境变量
      delete process.env.ENCRYPTION_KEY;
      // 重置模块缓存
      jest.resetModules();
    });
    
    afterEach(() => {
      // 恢复环境变量
      process.env.ENCRYPTION_KEY = originalEnv;
    });
    
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      // 重新导入模块应该抛出错误
      expect(() => {
        jest.isolateModules(() => {
          // 确保在导入模块时环境变量未设置
          delete process.env.ENCRYPTION_KEY;
          const { encrypt } = require('../../middleware/encryption');
          encrypt('test');
        });
      }).toThrow('ENCRYPTION_KEY environment variable is required');
    });
    
    it('should throw error when ENCRYPTION_KEY is not 32 bytes long', () => {
      // 设置错误长度的密钥
      process.env.ENCRYPTION_KEY = 'too-short-key';
      
      // 重新导入模块应该抛出错误
      expect(() => {
        const { initializeEncryptionKey } = require('../../middleware/encryption');
        initializeEncryptionKey();
      }).toThrow('ENCRYPTION_KEY must be 32 bytes (256 bits) long');
    });
  });
  
  describe('encrypt/decrypt functions', () => {
    beforeEach(() => {
      // 设置有效的加密密钥
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      // 初始化加密密钥
      require('../../middleware/encryption').initializeEncryptionKey();
    });

    it('should correctly encrypt and decrypt data', () => {
      const originalText = 'Hello, World!';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should generate different encrypted values for same input', () => {
      const text = 'Same text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => decrypt('invalid:data')).toThrow();
    });
  });

  describe('encryptionMiddleware', () => {
    let ctx: Partial<Context> & {
      request: Request & { body: any };
      body: any;
      get: jest.Mock<string>;
      set: jest.Mock<void>;
      throw: jest.Mock<never> & {
        (message: string, code?: number, properties?: {}): never;
        (status: number): never;
        (...properties: (string | number | {})[]): never;
      };
      app: Application;
      req: IncomingMessage;
      res: ServerResponse;
    };
    let next: jest.Mock<Promise<void>>;

    beforeEach(() => {
      // 设置有效的加密密钥
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      // 初始化加密密钥
      require('../../middleware/encryption').initializeEncryptionKey();

      ctx = {
        request: { body: '', app: {}, req: {}, res: {}, ctx: {} } as Request & { body: any },
        body: null,
        get: jest.fn(),
        set: jest.fn(),
        throw: jest.fn() as jest.Mock<never> & {
          (message: string, code?: number, properties?: {}): never;
          (status: number): never;
          (...properties: (string | number | {})[]): never;
        },
        app: new Application(),
        req: {} as IncomingMessage,
        res: {} as ServerResponse
      };
      next = jest.fn().mockImplementation(() => Promise.resolve());
    });

    it('should skip encryption when x-needs-encryption is not true', async () => {
      ctx.get.mockReturnValue('false');
      await encryptionMiddleware(ctx as Context, next as Next);
      expect(next).toHaveBeenCalled();
      expect(ctx.set).not.toHaveBeenCalled();
    });

    it('should decrypt request body and encrypt response', async () => {
      const originalBody = { message: 'test' };
      const encrypted = encrypt(JSON.stringify(originalBody));
      
      ctx.request.body = encrypted;
      ctx.get.mockReturnValue('true');
      
      // 模拟响应数据
      next.mockImplementation(() => {
        ctx.body = { response: 'success' };
        return Promise.resolve();
      });
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(ctx.request.body).toEqual(originalBody);
      expect(next).toHaveBeenCalled();
      expect(ctx.body).not.toEqual({ response: 'success' }); // 应该被加密
      expect(typeof ctx.body).toBe('string');
      expect(ctx.set).toHaveBeenCalledWith('x-encrypted-response', 'true');
      
      // 验证加密的响应可以被正确解密
      const decrypted = JSON.parse(decrypt(ctx.body as string));
      expect(decrypted).toEqual({ response: 'success' });
    });

    it('should handle invalid encrypted data', async () => {
      ctx.request.body = 'invalid:data';
      ctx.get.mockReturnValue('true');
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(ctx.throw).toHaveBeenCalledWith(400, 'Encryption/Decryption failed');
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should handle encryption error when encrypting response', async () => {
      ctx.get.mockReturnValue('true');
      
      // 模拟响应数据，但设置为一个无法被JSON.stringify的对象
      next.mockImplementation(() => {
        const circularObj: any = {};
        circularObj.self = circularObj; // 创建循环引用
        ctx.body = circularObj;
        return Promise.resolve();
      });
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(ctx.throw).toHaveBeenCalledWith(500, '响应数据加密失败');
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should handle other errors in middleware', async () => {
      ctx.get.mockReturnValue('true');
      
      // 模拟中间件中的其他错误
      next.mockRejectedValueOnce(new Error('Unexpected error'));
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(logger.error).toHaveBeenCalled();
      expect(ctx.throw).toHaveBeenCalledWith(400, '加密/解密处理失败');
    });
    
    it('should rethrow error with status 400 or 500', async () => {
      ctx.get.mockReturnValue('true');
      
      // 模拟已处理的错误
      const statusError = new Error('Already handled error') as any;
      statusError.status = 400;
      next.mockRejectedValueOnce(statusError);
      
      await expect(encryptionMiddleware(ctx as Context, next as Next)).rejects.toThrow('Already handled error');
    });
  });
});