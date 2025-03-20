import bcrypt from 'bcryptjs';
import { CreateOptions, UpdateOptions } from 'sequelize';
import sequelize from '../../config/database';
import User from '../../models/user';
import * as dbInit from '../../utils/dbInit';

// 模拟bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn().mockResolvedValue(true)
}));

// 模拟数据库初始化函数
jest.mock('../../utils/dbInit', () => ({
  checkDatabaseStructure: jest.fn().mockResolvedValue(undefined)
}));

describe('User Model Hooks', () => {
  beforeAll(async () => {
    // 避免实际连接数据库
    jest.spyOn(sequelize, 'authenticate').mockImplementation(() => Promise.resolve());
    jest.spyOn(sequelize, 'sync').mockImplementation(() => Promise.resolve({} as any));
    
    // 确保数据库检查函数被正确模拟
    (dbInit.checkDatabaseStructure as jest.Mock).mockClear();
  });
  
  beforeEach(() => {
    // 在每个测试前重置所有mock
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('beforeCreate hook', () => {
    it('should hash password before creating user', async () => {
      // 设置bcrypt.hash的返回值
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');

      // 创建用户实例
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        status: 'active'
      });

      // 直接调用钩子函数
      const beforeCreateHooks = User.options.hooks?.beforeCreate;
      if (beforeCreateHooks && Array.isArray(beforeCreateHooks) && beforeCreateHooks.length > 0) {
        await (beforeCreateHooks as Array<(user: any, options: any) => Promise<void>>)[0](user, {} as CreateOptions);
      }

      // 验证密码是否被加密
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(user.password).toBe('hashed_password');
    });

    it('should throw error when password encryption fails', async () => {
      // 模拟bcrypt.hash抛出错误
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Encryption failed'));

      // 创建用户实例
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        status: 'active'
      });

      // 验证钩子是否抛出错误
      const beforeCreateHooks = User.options.hooks?.beforeCreate;
      if (beforeCreateHooks && Array.isArray(beforeCreateHooks) && beforeCreateHooks.length > 0) {
        await expect((beforeCreateHooks as Array<(user: any, options: any) => Promise<void>>)[0](user, {} as CreateOptions)).rejects.toThrow('密码加密失败');
      } else {
        fail('beforeCreate hooks not found');
      }
    });
  });

  describe('beforeUpdate hook', () => {
    it('should hash password when password is changed', async () => {
      // 设置bcrypt.hash的返回值
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new_hashed_password');

      // 创建用户实例并模拟changed方法
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password: 'newpassword',
        role: 'user',
        status: 'active'
      });
      user.changed = jest.fn().mockReturnValue(true);

      // 直接调用钩子函数
      const beforeUpdateHooks = User.options.hooks?.beforeUpdate;
      if (beforeUpdateHooks && Array.isArray(beforeUpdateHooks) && beforeUpdateHooks.length > 0) {
        await (beforeUpdateHooks as Array<(user: any, options: any) => Promise<void>>)[0](user, { where: { id: 1 } } as UpdateOptions);
      }

      // 验证密码是否被加密
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(user.password).toBe('new_hashed_password');
    });

    it('should not hash password when password is not changed', async () => {
      // 创建用户实例并模拟changed方法
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        status: 'active'
      });
      user.changed = jest.fn().mockReturnValue(false);

      // 直接调用钩子函数
      const beforeUpdateHooks = User.options.hooks?.beforeUpdate;
      if (beforeUpdateHooks && Array.isArray(beforeUpdateHooks) && beforeUpdateHooks.length > 0) {
        await (beforeUpdateHooks as Array<(user: any, options: any) => Promise<void>>)[0](user, { where: { id: 1 } } as UpdateOptions);
      }

      // 验证bcrypt.hash没有被调用
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw error when password encryption fails during update', async () => {
      // 模拟bcrypt.hash抛出错误
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error('Encryption failed'));

      // 创建用户实例并模拟changed方法
      const user = User.build({
        username: 'testuser',
        email: 'test@example.com',
        password: 'newpassword',
        role: 'user',
        status: 'active'
      });
      user.changed = jest.fn().mockReturnValue(true);

      // 验证钩子是否抛出错误
      const beforeUpdateHooks = User.options.hooks?.beforeUpdate;
      if (beforeUpdateHooks && Array.isArray(beforeUpdateHooks) && beforeUpdateHooks.length > 0) {
        await expect((beforeUpdateHooks as Array<(user: any, options: any) => Promise<void>>)[0](user, { where: { id: 1 } } as UpdateOptions)).rejects.toThrow('密码加密失败');
      } else {
        fail('beforeUpdate hooks not found');
      }
    });
  });
});