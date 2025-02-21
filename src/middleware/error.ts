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

    // 设置响应
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message,
      data: null
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