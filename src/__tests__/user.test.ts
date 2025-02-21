import { testDb } from './setup';
import User from '../models/user';
import { hashPassword, comparePassword } from '../utils/auth';

describe('User Model Tests', () => {
  beforeAll(async () => {
    await User.sync({ force: true });
  });

  describe('User Creation', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = await hashPassword(userData.password);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(await comparePassword(userData.password, user.password)).toBe(true);
    });

    it('should not create user with duplicate email', async () => {
      const hashedPassword = await hashPassword(userData.password);
      await expect(User.create({
        ...userData,
        username: 'anotheruser',
        password: hashedPassword
      })).rejects.toThrow();
    });

    it('should not create user with invalid email', async () => {
      await expect(User.create({
        ...userData,
        email: 'invalid-email',
        username: 'newuser'
      })).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    let user: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('testpass123');
      user = await User.create({
        username: 'authuser',
        email: 'auth@example.com',
        password: hashedPassword,
        role: 'user'
      });
    });

    it('should verify correct password', async () => {
      const isValid = await comparePassword('testpass123', user.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await comparePassword('wrongpass', user.password);
      expect(isValid).toBe(false);
    });
  });

  afterEach(async () => {
    await User.destroy({
      where: {},
      truncate: true
    });
  });
});