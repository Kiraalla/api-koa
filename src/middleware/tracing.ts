import { Context, Next } from 'koa';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface TracingContext extends Context {
  traceId?: string;
  spanId?: string;
  startTime?: number;
}

export const tracing = async (ctx: TracingContext, next: Next) => {
  // 生成追踪ID和Span ID
  ctx.traceId = uuidv4();
  ctx.spanId = uuidv4();
  ctx.startTime = Date.now();

  // 在响应头中添加追踪ID
  ctx.set('X-Trace-ID', ctx.traceId || '');

  // 记录请求开始
  logger.info('Request started', {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    method: ctx.method,
    path: ctx.path,
    query: ctx.query,
    ip: ctx.ip
  });

  try {
    await next();
  } finally {
    // 计算请求处理时间
    const duration = Date.now() - ctx.startTime;

    // 记录请求结束
    logger.info('Request completed', {
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      method: ctx.method,
      path: ctx.path,
      status: ctx.status,
      duration,
      responseSize: ctx.response.length
    });
  }
};