import { Context } from 'koa';
import { logger } from '../utils/logger';

// 错误处理中间件
export const errorHandler = async (ctx: Context, next: () => Promise<any>) => {
  try {
    await next();
  } catch (err: any) {
    // 记录错误日志
    logger.error('请求处理错误', {
      error: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
      body: ctx.request.body,
      query: ctx.query,
      ip: ctx.ip
    });

    // 根据错误类型设置不同的状态码和消息
    let status = err.status || 500;
    let message = err.message;

    // 处理验证错误
    if (err.name === 'ValidationError') {
      status = 400;
      message = err.details ? err.details[0].message : '请求参数验证失败';
    }

    // 处理业务逻辑错误
    if (err.name === 'BusinessError') {
      status = 400;
    }

    // 处理认证错误
    if (err.name === 'AuthenticationError') {
      status = 401;
      message = '认证失败';
    }

    // 处理授权错误
    if (err.name === 'AuthorizationError') {
      status = 403;
      message = '没有权限访问该资源';
    }

    // 设置响应
    ctx.status = status;
    ctx.body = {
      success: false,
      message: process.env.NODE_ENV === 'production' && status === 500
        ? '服务器内部错误'
        : message,
      data: null,
      // 在非生产环境下提供更多错误详情
      ...(process.env.NODE_ENV !== 'production' && {
        error: {
          name: err.name,
          stack: err.stack
        }
      })
    };
  }
};

// 请求日志中间件
export const requestLogger = async (ctx: Context, next: () => Promise<any>) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  logger.info('请求处理完成', {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${ms}ms`,
    ip: ctx.ip
  });
};