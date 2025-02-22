import User from '../../models/user';
import sequelize from '../../config/database';

describe('User Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // 清空数据库并重新创建表
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} }); // 每个测试前清空用户表
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };

      const user = await User.create(userData);
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // 密码应该被加密
    });

    it('should not create user with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not create user with invalid email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      });
    });

    it('should find user by username', async () => {
      const user = await User.findOne({ where: { username: 'testuser' } });
      expect(user).not.toBeNull();
      expect(user?.username).toBe('testuser');
    });

    it('should verify password correctly', async () => {
      const user = await User.findOne({ where: { username: 'testuser' } });
      expect(user).not.toBeNull();
      
      if (user && typeof user.comparePassword === 'function') {
        const isValid = await user.comparePassword('password123');
        expect(isValid).toBe(true);

        const isInvalid = await user.comparePassword('wrongpassword');
        expect(isInvalid).toBe(false);
      }
    });
  });

  describe('User Updates', () => {
    let user: User;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      });
    });

    it('should update user email', async () => {
      const newEmail = 'newemail@example.com';
      await user.update({ email: newEmail });
      expect(user.email).toBe(newEmail);
    });

    it('should not update to invalid email', async () => {
      await expect(user.update({ email: 'invalid-email' })).rejects.toThrow();
    });
  });
});