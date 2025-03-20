import Router from '@koa/router';
import { Op } from 'sequelize';
import { userSchemas, validate } from '../middleware/validator';
import User from '../models/user';
import { CustomContext, LoginRequest, RegisterRequest } from '../types/index';
import { authMiddleware, generateToken } from '../utils/auth';

const router = new Router({ prefix: '/api/users' });

// 用户注册
router.post('/register', validate(userSchemas.register), async (ctx: CustomContext) => {
  const { username, email, password, phone } = ctx.request.body as RegisterRequest;

  try {
    // 不需要预先加密密码，User模型的beforeCreate钩子会处理加密
    const user = await User.create({
      username,
      email,
      password, // 直接使用原始密码，让模型钩子处理加密
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
    console.error('用户注册失败:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      ctx.status = 400;
      const field = error.errors[0]?.path;
      const message = field === 'email' ? '该邮箱已被注册' :
                     field === 'username' ? '该用户名已被使用' :
                     '该字段已存在';
      ctx.body = {
        success: false,
        message,
        data: null,
        code: 400
      };
      return;
    }

    if (error.name === 'SequelizeValidationError') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.errors[0]?.message || '输入数据验证失败',
        data: null,
        code: 400
      };
      return;
    }

    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
      ctx.status = 503;
      ctx.body = {
        success: false,
        message: '数据库连接失败，请检查数据库服务是否正常',
        data: null,
        code: 503
      };
      return;
    }

    if (error.name === 'SequelizeDatabaseError') {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '数据库操作失败，可能是表结构或数据类型不匹配',
        data: null,
        code: 500
      };
      return;
    }

    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '注册失败，系统内部错误',
      data: null,
      code: 500
    };
  }
});

// 用户登录
router.post('/login', validate(userSchemas.login), async (ctx: CustomContext) => {
  const { username, password } = ctx.request.body as LoginRequest;

  try {
    // 查找用户
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username } // 支持使用邮箱作为用户名登录
        ]
      }
    });

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户名或密码错误',
        data: null,
        code: 401
      };
      return;
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: user.status === 'suspended' ? '账号已被暂停使用' : '账号未激活',
        data: null,
        code: 403
      };
      return;
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户名或密码错误',
        data: null,
        code: 401
      };
      return;
    }

    // 更新最后登录时间
    await user.update({ last_login: new Date() });

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
      },
      code: 200
    };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      code: 500,
      message: error.message || '登录失败，请稍后重试',
      data: null
    };
  }
});

// 用户信息更新
router.put('/:id', authMiddleware, async (ctx: CustomContext) => {
  // 校验用户ID格式
  if (isNaN(parseInt(ctx.params.id, 10))) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '用户ID格式错误',
      data: null,
      code: 400
    };
    return;
  }
  const userId = parseInt(ctx.params.id, 10);
  
  // 检查权限：只有管理员或用户本人可以修改用户信息
  if (!ctx.state.user || (ctx.state.user.role !== 'admin' && ctx.state.user.id !== userId)) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '无权限修改其他用户信息',
      data: null,
      code: 403
    };
    return;
  }
  const { email, phone, password, status } = ctx.request.body as {
    email?: string;
    phone?: string;
    password?: string;
    status?: string;
  };

  try {
    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在',
        data: null,
        code: 404
      };
      return;
    }

    // 更新用户信息
    const updateData: any = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (password) updateData.password = password;
    if (status) updateData.status = status;

    await user.update(updateData);

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: '更新成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        last_login: user.last_login
      },
      code: 200
    };
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      ctx.status = 400;
      const field = error.errors[0]?.path;
      const message = field === 'email' ? '该邮箱已被注册' : '该字段已存在';
      ctx.body = {
        success: false,
        message,
        data: null,
        code: 400
      };
      return;
    }

    if (error.name === 'SequelizeValidationError') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.errors[0]?.message || '输入数据验证失败',
        data: null,
        code: 400
      };
      return;
    }

    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '更新失败，请稍后重试',
      data: null,
      code: 500
    };
  }
});

// 密码验证
router.post('/verify-password', authMiddleware, validate(userSchemas.verifyPassword), async (ctx: CustomContext) => {
  const { username, email, password } = ctx.request.body as {
    username?: string;
    email?: string;
    password: string;
  };

  try {
    // 查找用户 - 支持通过username或email查找
    const whereClause = username ? { username } : { email };
    const user = await User.findOne({ where: whereClause });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在',
        data: null,
        code: 404
      };
      return;
    }
    // 验证密码
    const isValid = await user.comparePassword(password);

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: '密码验证成功',
      data: {
        isValid
      },
      code: 200
    };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '验证失败，请稍后重试',
      data: null,
      code: 500
    };
  }
});

export default router;
