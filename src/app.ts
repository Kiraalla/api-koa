import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import dotenv from 'dotenv';
import userRoutes from './routes/user';
import { errorHandler, requestLogger } from './middleware/error';
import { createRateLimiter } from './middleware/ratelimit';
import { performanceMonitor } from './middleware/monitor';
import { tracing } from './middleware/tracing';

// 加载环境变量
dotenv.config();

// 创建Koa实例
const app = new Koa();

// 使用中间件
app.use(cors());
app.use(bodyParser());

// 添加链路追踪中间件
app.use(tracing);

// 添加日志和错误处理中间件
app.use(requestLogger);
app.use(errorHandler);

// 添加速率限制中间件
app.use(createRateLimiter());

// 添加性能监控中间件
app.use(performanceMonitor);

// 响应格式化中间件
app.use(async (ctx, next) => {
  await next();
  if (!ctx.body) {
    ctx.body = {
      success: true,
      message: 'success',
      data: null
    };
  } else if (ctx.body.success === undefined) {
    ctx.body = {
      success: true,
      message: 'success',
      data: ctx.body
    };
  }
});

// 路由配置
const router = new Router();
router.use(userRoutes.routes());
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

export default app;