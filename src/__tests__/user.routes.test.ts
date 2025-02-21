import request from 'supertest';
import app from '../app';
import User from '../models/user';
import { hashPassword } from '../utils/auth';

describe('User Routes Tests', () => {
  beforeAll(async () => {
    await User.sync({ force: true });
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app.callback())
        .post('/users/register')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.headers['x-trace-id']).toBeDefined();
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app.callback())
        .post('/users/register')
        .send(userData);

      const response = await request(app.callback())
        .post('/users/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.headers['x-trace-id']).toBeDefined();
    });
  });

  describe('POST /users/login', () => {
    beforeEach(async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: await hashPassword('password123')
      };
      await User.create(userData);
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app.callback())
        .post('/users/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.headers['x-trace-id']).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app.callback())
        .post('/users/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.headers['x-trace-id']).toBeDefined();
    });
  });
});