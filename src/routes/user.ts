import Router from '@koa/router';
import bcrypt from 'bcryptjs';
import { userSchemas, validate } from '../middleware/validator';
import User from '../models/user';
import { CustomContext, LoginRequest, RegisterRequest } from '../types';
import { generateToken } from '../utils/auth';

const router = new Router({ prefix: '/users' });

// 用户注册
router.post('/register', validate(userSchemas.register), async (ctx: CustomContext) => {
  const { username, email, password, phone } = ctx.request.body as RegisterRequest;

  try {
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      role: 'user'
    });

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: '注册成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      code: 200
    };
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该邮箱已被注册',
        data: null
      };
      return;
    }

    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '注册失败，请稍后重试',
      data: null
    };
  }
});

// 用户登录
router.post('/login', validate(userSchemas.login), async (ctx: CustomContext) => {
  const { email, password } = ctx.request.body as LoginRequest;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户名或密码错误',
        data: null
      };
      return;
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户名或密码错误',
        data: null
      };
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '登录失败，请稍后重试',
      data: null
    };
  }
});

export default router;
