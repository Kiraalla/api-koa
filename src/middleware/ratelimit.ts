import ratelimit from 'koa-ratelimit';
import { Context } from 'koa';

// 创建内存存储
const db = new Map();

// 配置速率限制中间件
export const rateLimiter = ratelimit({
  driver: 'memory',
  db: db,
  duration: 60000, // 1分钟
  max: 100,       // 最大请求次数
  errorMessage: '请求过于频繁，请稍后再试',
  id: (ctx: Context) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  disableHeader: false,
  whitelist: (ctx: Context) => {
    // 可以在这里添加IP白名单逻辑
    return false;
  },
  blacklist: (ctx: Context) => {
    // 可以在这里添加IP黑名单逻辑
    return false;
  }
});