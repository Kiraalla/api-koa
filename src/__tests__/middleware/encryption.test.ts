import { encrypt, decrypt, encryptionMiddleware } from '../../middleware/encryption';
import { Context, Next, Request } from 'koa';
import { Mock, UnknownFunction } from 'jest-mock';
import { IncomingMessage, ServerResponse } from 'http';
import Application from 'koa';

// 模拟环境变量
process.env.ENCRYPTION_KEY = 'a'.repeat(32);

describe('Encryption Middleware', () => {
  describe('encrypt/decrypt functions', () => {
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
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(ctx.request.body).toEqual(originalBody);
      expect(next).toHaveBeenCalled();
    });

    it('should handle invalid encrypted data', async () => {
      ctx.request.body = 'invalid:data';
      ctx.get.mockReturnValue('true');
      
      await encryptionMiddleware(ctx as Context, next as Next);
      
      expect(ctx.throw).toHaveBeenCalledWith(400, 'Encryption/Decryption failed');
    });
  });
});