import cors from '@koa/cors';
import dotenvFlow from 'dotenv-flow';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { errorHandler, requestLogger } from './middleware/error';
import { performanceMonitor } from './middleware/monitor';
import { createRateLimiter } from './middleware/ratelimit';
import { tracing } from './middleware/tracing';
import userRoutes from './routes/user';

// 加载环境变量
dotenvFlow.config({
  node_env: process.env.NODE_ENV || 'development', // 显式设置默认环境
  default_node_env: 'development' // 双重保险
});

// 创建Koa实例
const app = new Koa();

// 基础中间件
app.use(cors());
app.use(bodyParser());

// 添加链路追踪中间件
app.use(tracing);

// 添加速率限制中间件
app.use(createRateLimiter());

// 添加性能监控中间件
app.use(performanceMonitor);

// 添加日志中间件
app.use(requestLogger);

import { ApiResponse } from './types/common';

// 响应格式化中间件
const responseFormatter = async (ctx: Koa.Context, next: Koa.Next) => {
  await next();
  
  // 如果是404错误，直接返回
  if (ctx.status === 404) return;

  // 处理成功响应
  if (!ctx.body) {
    ctx.body = {
      success: true,
      message: 'success',
      data: null,
      code: ctx.status,
      timestamp: Date.now()
    } as ApiResponse;
  } else if ((ctx.body as ApiResponse).success === undefined) {
    ctx.body = {
      success: true,
      message: 'success',
      data: ctx.body,
      code: ctx.status,
      timestamp: Date.now()
    } as ApiResponse;
  }
};

// 添加响应格式化中间件
app.use(responseFormatter);

// 注册用户路由
app.use(userRoutes.routes());
app.use(userRoutes.allowedMethods());

// 添加错误处理中间件
app.use(errorHandler);

// 处理404错误
app.use(async (ctx) => {
  if (ctx.status === 404) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '请求的资源不存在',
      data: null,
      code: 404
    };
  }
});

// 启动服务器
// 仅在非测试环境下启动服务器
if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}

export default app;
