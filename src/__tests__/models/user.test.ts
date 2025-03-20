import sequelize from '../../config/database';
import User from '../../models/user';

describe('User Model', () => {
  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      console.log('数据库连接成功');
      // 使用alter而不是force，以保持数据结构的完整性
      await sequelize.sync({ alter: true });
    } catch (error) {
      console.error('无法连接到数据库:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // 使用truncate确保完全清空表并重置自增ID
    await User.destroy({
      truncate: true,
      cascade: true,
      force: true
    });
  });

  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        status: 'active'
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
        email: 'test@example.com',
        role: 'user',
        status: 'active'
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not create user with invalid email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'invalid-email',
        role: 'user',
        status: 'active'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        status: 'active'
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
    
    it('should update user password and hash it', async () => {
      const user = await User.findOne({ where: { username: 'testuser' } });
      expect(user).not.toBeNull();
      
      if (user) {
        const originalPassword = user.password;
        user.password = 'newpassword123';
        await user.save();
        
        // 验证密码已更改且已加密
        expect(user.password).not.toBe(originalPassword);
        expect(user.password).not.toBe('newpassword123');
        
        // 验证新密码可以正确验证
        const isValid = await user.comparePassword('newpassword123');
        expect(isValid).toBe(true);
      }
    });
  });

  describe('User Updates', () => {
    let user: User;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        role: 'user',
        status: 'active'
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