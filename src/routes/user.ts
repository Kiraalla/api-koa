import Router from '@koa/router';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import { generateToken } from '../utils/auth';
import { validate, userSchemas } from '../middleware/validator';
import { CustomContext, RegisterRequest, LoginRequest, BaseResponse, LoginResponse } from '../types';

const router = new Router({ prefix: '/api/users' });

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
      phone
    });

    ctx.body = {
      success: true,
      message: '注册成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '注册失败',
      data: null
    };
  }
});

// 用户登录
router.post('/login', validate(userSchemas.login), async (ctx: CustomContext) => {
  const { username, password } = ctx.request.body as LoginRequest;

  try {
    const user = await User.findOne({ where: { username } });
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
    const isValidPassword = await bcrypt.compare(password, user.password);
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

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '登录失败',
      data: null
    };
  }
});

export default router;